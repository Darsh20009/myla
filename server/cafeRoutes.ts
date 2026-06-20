import type { Express, Request, Response } from "express";
import { AttendanceModel, LeaveRequestModel, RawMaterialModel, RecipeModel, SupplierModel, GiftCardModel, ExpenseModel, TableReservationModel, OrderModel, UserModel, EmployeeProfileModel, ShiftTemplateModel, EmployeeShiftModel, RestaurantTableModel, WasteLogModel, ProductModel } from "./models";

interface AuthRequest extends Request {
  user?: any;
}

function requireAdmin(req: AuthRequest, res: Response, next: any) {
  if (!req.user) return res.status(401).json({ message: "غير مصرح" });
  const allowed = ["admin", "assistant_manager", "accountant", "tech_support"];
  if (!allowed.includes(req.user.role)) return res.status(403).json({ message: "ليس لديك صلاحية" });
  next();
}

function requireAuth(req: AuthRequest, res: Response, next: any) {
  if (!req.user) return res.status(401).json({ message: "غير مصرح" });
  next();
}

function todayStr() {
  return new Date().toISOString().split("T")[0];
}

export function registerCafeRoutes(app: Express) {

  // ─────────────────────────────────────────────────────────────────────────────
  // ATTENDANCE
  // ─────────────────────────────────────────────────────────────────────────────

  // Employee: get today's attendance status
  app.get("/api/attendance/my-status", requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = String(req.user._id || req.user.id);
      const today = todayStr();
      const att = await AttendanceModel.findOne({ employeeId: uid, date: today }).lean();
      res.json({
        hasCheckedIn: !!att?.checkInTime,
        hasCheckedOut: !!att?.checkOutTime,
        attendance: att ? { id: String((att as any)._id), checkInTime: att.checkInTime, checkOutTime: att.checkOutTime, isLate: att.isLate, lateMinutes: att.lateMinutes } : null,
      });
    } catch { res.status(500).json({ error: "خطأ في الخادم" }); }
  });

  // Employee: check in
  app.post("/api/attendance/check-in", requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = String(req.user._id || req.user.id);
      const today = todayStr();
      const existing = await AttendanceModel.findOne({ employeeId: uid, date: today });
      if (existing?.checkInTime) return res.status(400).json({ error: "لقد سجلت حضورك اليوم بالفعل" });

      const now = new Date();
      const shiftStart = new Date(); shiftStart.setHours(8, 0, 0, 0);
      const isLate = now > shiftStart;
      const lateMinutes = isLate ? Math.floor((now.getTime() - shiftStart.getTime()) / 60000) : 0;

      const att = await AttendanceModel.findOneAndUpdate(
        { employeeId: uid, date: today },
        {
          $set: {
            employeeId: uid,
            employeeName: req.user.name || "",
            branchId: req.user.branchId || "",
            date: today,
            checkInTime: now,
            checkInPhoto: req.body.photoUrl || "",
            checkInLocation: req.body.location || null,
            status: "present",
            isLate,
            lateMinutes,
          }
        },
        { upsert: true, new: true }
      );

      res.json({ message: isLate ? `تم التسجيل (متأخر ${lateMinutes} دقيقة)` : "تم تسجيل الحضور بنجاح", attendance: att });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // Employee: check out
  app.post("/api/attendance/check-out", requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = String(req.user._id || req.user.id);
      const today = todayStr();
      const att = await AttendanceModel.findOne({ employeeId: uid, date: today });
      if (!att?.checkInTime) return res.status(400).json({ error: "لم تسجل حضورك اليوم" });
      if (att.checkOutTime) return res.status(400).json({ error: "لقد سجلت انصرافك بالفعل" });

      const now = new Date();
      const workMinutes = Math.floor((now.getTime() - new Date(att.checkInTime).getTime()) / 60000);

      att.checkOutTime = now;
      att.checkOutPhoto = req.body.photoUrl || "";
      att.checkOutLocation = req.body.location || null;
      att.workMinutes = workMinutes;
      await att.save();

      res.json({ message: "تم تسجيل الانصراف بنجاح", workMinutes });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // Admin: list all attendance
  app.get("/api/admin/attendance", requireAdmin, async (req, res) => {
    try {
      const { date, employeeId } = req.query as any;
      const query: any = {};
      if (date) query.date = date;
      if (employeeId) query.employeeId = employeeId;
      const records = await AttendanceModel.find(query).sort({ createdAt: -1 }).limit(200).lean();
      res.json(records.map((r: any) => ({ ...r, id: String(r._id) })));
    } catch { res.status(500).json({ error: "خطأ في الخادم" }); }
  });

  // Admin: attendance stats for a date range
  app.get("/api/admin/attendance/stats", requireAdmin, async (req, res) => {
    try {
      const { from, to } = req.query as any;
      const query: any = {};
      if (from && to) query.date = { $gte: from, $lte: to };
      const total = await AttendanceModel.countDocuments(query);
      const late = await AttendanceModel.countDocuments({ ...query, isLate: true });
      const present = await AttendanceModel.countDocuments({ ...query, checkInTime: { $exists: true } });
      res.json({ total, late, present, absent: total - present });
    } catch { res.status(500).json({ error: "خطأ في الخادم" }); }
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // LEAVE REQUESTS
  // ─────────────────────────────────────────────────────────────────────────────

  app.get("/api/leave-requests", requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = String(req.user._id || req.user.id);
      const isAdmin = ["admin", "assistant_manager"].includes(req.user.role);
      const query: any = isAdmin ? {} : { employeeId: uid };
      const requests = await LeaveRequestModel.find(query).sort({ createdAt: -1 }).lean();
      res.json(requests.map((r: any) => ({ ...r, id: String(r._id) })));
    } catch { res.status(500).json({ error: "خطأ في الخادم" }); }
  });

  app.post("/api/leave-requests", requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = String(req.user._id || req.user.id);
      const { startDate, endDate, reason, type } = req.body;
      if (!startDate || !endDate || !reason) return res.status(400).json({ error: "جميع الحقول مطلوبة" });

      const start = new Date(startDate);
      const end = new Date(endDate);
      const numberOfDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

      const leave = await LeaveRequestModel.create({
        employeeId: uid,
        employeeName: req.user.name || "",
        type: type || "annual",
        startDate: start,
        endDate: end,
        numberOfDays,
        reason,
        status: "pending",
      });

      res.status(201).json({ ...leave.toObject(), id: String(leave._id) });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.patch("/api/admin/leave-requests/:id", requireAdmin, async (req: AuthRequest, res) => {
    try {
      const { status, rejectionReason } = req.body;
      const updated = await LeaveRequestModel.findByIdAndUpdate(
        req.params.id,
        { $set: { status, rejectionReason: rejectionReason || "", approvedBy: req.user?.name || "", approvedAt: new Date() } },
        { new: true }
      );
      if (!updated) return res.status(404).json({ error: "الطلب غير موجود" });
      res.json({ ...updated.toObject(), id: String(updated._id) });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // RAW MATERIALS
  // ─────────────────────────────────────────────────────────────────────────────

  app.get("/api/inventory/raw-materials", requireAdmin, async (_req, res) => {
    try {
      const items = await RawMaterialModel.find().sort({ nameAr: 1 }).lean();
      res.json(items.map((i: any) => ({ ...i, id: String(i._id) })));
    } catch { res.status(500).json({ error: "خطأ في الخادم" }); }
  });

  app.post("/api/inventory/raw-materials", requireAdmin, async (req: AuthRequest, res) => {
    try {
      const item = await RawMaterialModel.create(req.body);
      res.status(201).json({ ...item.toObject(), id: String(item._id) });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.put("/api/inventory/raw-materials/:id", requireAdmin, async (req, res) => {
    try {
      const item = await RawMaterialModel.findByIdAndUpdate(req.params.id, { $set: req.body }, { new: true });
      if (!item) return res.status(404).json({ error: "العنصر غير موجود" });
      res.json({ ...item.toObject(), id: String(item._id) });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.patch("/api/inventory/raw-materials/:id/stock", requireAdmin, async (req, res) => {
    try {
      const { delta, note } = req.body;
      const item = await RawMaterialModel.findById(req.params.id);
      if (!item) return res.status(404).json({ error: "العنصر غير موجود" });
      (item as any).currentStock = Math.max(0, ((item as any).currentStock || 0) + Number(delta));
      await item.save();
      res.json({ ...item.toObject(), id: String(item._id) });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.delete("/api/inventory/raw-materials/:id", requireAdmin, async (req, res) => {
    try {
      await RawMaterialModel.findByIdAndDelete(req.params.id);
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // Low stock alerts
  app.get("/api/inventory/raw-materials/alerts", requireAdmin, async (_req, res) => {
    try {
      const items = await RawMaterialModel.find({ isActive: true }).lean();
      const alerts = (items as any[]).filter(i => (i.minStockLevel > 0) && (i.currentStock <= i.minStockLevel))
        .map(i => ({ ...i, id: String(i._id) }));
      res.json(alerts);
    } catch { res.status(500).json({ error: "خطأ في الخادم" }); }
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // RECIPES
  // ─────────────────────────────────────────────────────────────────────────────

  app.get("/api/inventory/recipes", requireAdmin, async (_req, res) => {
    try {
      const recipes = await RecipeModel.find().lean();
      res.json(recipes.map((r: any) => ({ ...r, id: String(r._id) })));
    } catch { res.status(500).json({ error: "خطأ في الخادم" }); }
  });

  app.post("/api/inventory/recipes", requireAdmin, async (req, res) => {
    try {
      const { productId, productName, ingredients, notes } = req.body;
      const totalCost = (ingredients || []).reduce((s: number, i: any) => s + (i.quantity || 0) * (i.unitCost || 0), 0);
      const existing = await RecipeModel.findOne({ productId });
      if (existing) {
        (existing as any).ingredients = ingredients;
        (existing as any).productName = productName;
        (existing as any).totalCost = totalCost;
        (existing as any).notes = notes;
        await existing.save();
        return res.json({ ...existing.toObject(), id: String(existing._id) });
      }
      const recipe = await RecipeModel.create({ productId, productName, ingredients, totalCost, notes });
      res.status(201).json({ ...recipe.toObject(), id: String(recipe._id) });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.put("/api/inventory/recipes/:id", requireAdmin, async (req, res) => {
    try {
      const { ingredients, notes, productName } = req.body;
      const totalCost = (ingredients || []).reduce((s: number, i: any) => s + (i.quantity || 0) * (i.unitCost || 0), 0);
      const recipe = await RecipeModel.findByIdAndUpdate(req.params.id, { $set: { ingredients, notes, productName, totalCost } }, { new: true });
      if (!recipe) return res.status(404).json({ error: "الوصفة غير موجودة" });
      res.json({ ...recipe.toObject(), id: String(recipe._id) });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.delete("/api/inventory/recipes/:id", requireAdmin, async (req, res) => {
    try {
      await RecipeModel.findByIdAndDelete(req.params.id);
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // SUPPLIERS
  // ─────────────────────────────────────────────────────────────────────────────

  app.get("/api/inventory/suppliers", requireAdmin, async (_req, res) => {
    try {
      const suppliers = await SupplierModel.find().sort({ name: 1 }).lean();
      res.json(suppliers.map((s: any) => ({ ...s, id: String(s._id) })));
    } catch { res.status(500).json({ error: "خطأ في الخادم" }); }
  });

  app.post("/api/inventory/suppliers", requireAdmin, async (req, res) => {
    try {
      const supplier = await SupplierModel.create(req.body);
      res.status(201).json({ ...supplier.toObject(), id: String(supplier._id) });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.put("/api/inventory/suppliers/:id", requireAdmin, async (req, res) => {
    try {
      const supplier = await SupplierModel.findByIdAndUpdate(req.params.id, { $set: req.body }, { new: true });
      if (!supplier) return res.status(404).json({ error: "المورد غير موجود" });
      res.json({ ...supplier.toObject(), id: String(supplier._id) });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.delete("/api/inventory/suppliers/:id", requireAdmin, async (req, res) => {
    try {
      await SupplierModel.findByIdAndDelete(req.params.id);
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // GIFT CARDS
  // ─────────────────────────────────────────────────────────────────────────────

  app.get("/api/admin/gift-cards", requireAdmin, async (_req, res) => {
    try {
      const cards = await GiftCardModel.find().sort({ createdAt: -1 }).lean();
      res.json(cards.map((c: any) => ({ ...c, id: String(c._id) })));
    } catch { res.status(500).json({ error: "خطأ في الخادم" }); }
  });

  app.post("/api/admin/gift-cards", requireAdmin, async (req: AuthRequest, res) => {
    try {
      const { initialBalance, expiryDate, recipientName, recipientPhone } = req.body;
      if (!initialBalance || initialBalance <= 0) return res.status(400).json({ error: "الرصيد غير صحيح" });

      // Generate unique code
      const code = "GC-" + Math.random().toString(36).substring(2, 8).toUpperCase();
      const card = await GiftCardModel.create({
        code,
        initialBalance: Number(initialBalance),
        currentBalance: Number(initialBalance),
        expiryDate: expiryDate ? new Date(expiryDate) : null,
        recipientName: recipientName || "",
        recipientPhone: recipientPhone || "",
        createdBy: req.user?.name || "",
        isActive: true,
      });
      res.status(201).json({ ...card.toObject(), id: String(card._id) });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.get("/api/gift-cards/:code/balance", async (req, res) => {
    try {
      const card = await GiftCardModel.findOne({ code: req.params.code.toUpperCase() }).lean();
      if (!card) return res.status(404).json({ error: "بطاقة الهدية غير موجودة" });
      if (!(card as any).isActive) return res.status(400).json({ error: "هذه البطاقة غير مفعّلة" });
      res.json({ code: (card as any).code, currentBalance: (card as any).currentBalance, initialBalance: (card as any).initialBalance });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.post("/api/gift-cards/:code/redeem", requireAdmin, async (req, res) => {
    try {
      const { amount, orderId } = req.body;
      const card = await GiftCardModel.findOne({ code: req.params.code.toUpperCase() });
      if (!card) return res.status(404).json({ error: "البطاقة غير موجودة" });
      if (!(card as any).isActive) return res.status(400).json({ error: "البطاقة غير مفعّلة" });
      if ((card as any).currentBalance < amount) return res.status(400).json({ error: "الرصيد غير كافٍ" });

      (card as any).currentBalance -= Number(amount);
      (card as any).transactions.push({ amount: Number(amount), type: "debit", orderId, at: new Date(), note: "استرداد" });
      if ((card as any).currentBalance <= 0) (card as any).isActive = false;
      await card.save();
      res.json({ newBalance: (card as any).currentBalance });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.patch("/api/admin/gift-cards/:id/toggle", requireAdmin, async (req, res) => {
    try {
      const card = await GiftCardModel.findById(req.params.id);
      if (!card) return res.status(404).json({ error: "البطاقة غير موجودة" });
      (card as any).isActive = !(card as any).isActive;
      await card.save();
      res.json({ isActive: (card as any).isActive });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // EXPENSES
  // ─────────────────────────────────────────────────────────────────────────────

  app.get("/api/admin/expenses", requireAdmin, async (req, res) => {
    try {
      const { from, to, category } = req.query as any;
      const query: any = {};
      if (from && to) query.date = { $gte: new Date(from), $lte: new Date(to) };
      if (category && category !== "all") query.category = category;
      const expenses = await ExpenseModel.find(query).sort({ date: -1 }).limit(500).lean();
      res.json(expenses.map((e: any) => ({ ...e, id: String(e._id) })));
    } catch { res.status(500).json({ error: "خطأ في الخادم" }); }
  });

  app.post("/api/admin/expenses", requireAdmin, async (req: AuthRequest, res) => {
    try {
      const { category, description, amount, date, branchId, paymentMethod, notes } = req.body;
      if (!category || !description || !amount) return res.status(400).json({ error: "الحقول المطلوبة ناقصة" });
      const expense = await ExpenseModel.create({
        category, description,
        amount: Number(amount),
        date: date ? new Date(date) : new Date(),
        branchId: branchId || "",
        paymentMethod: paymentMethod || "cash",
        notes: notes || "",
        recordedBy: req.user?.name || "",
      });
      res.status(201).json({ ...expense.toObject(), id: String(expense._id) });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.delete("/api/admin/expenses/:id", requireAdmin, async (req, res) => {
    try {
      await ExpenseModel.findByIdAndDelete(req.params.id);
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.get("/api/admin/expenses/summary", requireAdmin, async (req, res) => {
    try {
      const { from, to } = req.query as any;
      const query: any = {};
      if (from && to) query.date = { $gte: new Date(from), $lte: new Date(to) };
      const expenses = await ExpenseModel.find(query).lean();
      const total = (expenses as any[]).reduce((s, e) => s + e.amount, 0);
      const byCategory: Record<string, number> = {};
      (expenses as any[]).forEach(e => { byCategory[e.category] = (byCategory[e.category] || 0) + e.amount; });
      res.json({ total, byCategory, count: expenses.length });
    } catch { res.status(500).json({ error: "خطأ في الخادم" }); }
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // TABLE RESERVATIONS
  // ─────────────────────────────────────────────────────────────────────────────

  app.get("/api/admin/table-reservations", requireAdmin, async (req, res) => {
    try {
      const { status, date } = req.query as any;
      const query: any = {};
      if (status && status !== "all") query.status = status;
      if (date) {
        const d = new Date(date);
        const next = new Date(d); next.setDate(next.getDate() + 1);
        query.date = { $gte: d, $lt: next };
      }
      const reservations = await TableReservationModel.find(query).sort({ date: -1, time: 1 }).lean();
      res.json(reservations.map((r: any) => ({ ...r, id: String(r._id) })));
    } catch { res.status(500).json({ error: "خطأ في الخادم" }); }
  });

  // Public: customer creates reservation
  app.post("/api/table-reservations", async (req, res) => {
    try {
      const { customerName, customerPhone, date, time, partySize, branchId, notes } = req.body;
      if (!customerName || !customerPhone || !date || !time || !partySize) return res.status(400).json({ error: "جميع الحقول مطلوبة" });
      const reservation = await TableReservationModel.create({
        customerName, customerPhone,
        date: new Date(date), time,
        partySize: Number(partySize),
        branchId: branchId || "",
        notes: notes || "",
        status: "pending",
      });
      res.status(201).json({ ...reservation.toObject(), id: String(reservation._id) });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.patch("/api/admin/table-reservations/:id", requireAdmin, async (req: AuthRequest, res) => {
    try {
      const reservation = await TableReservationModel.findByIdAndUpdate(
        req.params.id,
        { $set: { ...req.body, confirmedBy: req.user?.name || "" } },
        { new: true }
      );
      if (!reservation) return res.status(404).json({ error: "الحجز غير موجود" });
      res.json({ ...reservation.toObject(), id: String(reservation._id) });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.delete("/api/admin/table-reservations/:id", requireAdmin, async (req, res) => {
    try {
      await TableReservationModel.findByIdAndDelete(req.params.id);
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // ADVANCED ANALYTICS
  // ─────────────────────────────────────────────────────────────────────────────

  app.get("/api/admin/analytics/overview", requireAdmin, async (req, res) => {
    try {
      const { period = "month" } = req.query as any;
      const now = new Date();
      let from = new Date();
      if (period === "today") from.setHours(0, 0, 0, 0);
      else if (period === "week") from.setDate(now.getDate() - 7);
      else if (period === "month") from.setDate(now.getDate() - 30);
      else if (period === "year") from.setFullYear(now.getFullYear() - 1);

      const orders = await OrderModel.find({ createdAt: { $gte: from }, status: { $nin: ["cancelled"] } }).lean();
      const totalRevenue = (orders as any[]).reduce((s, o) => s + parseFloat(o.total || "0"), 0);
      const totalOrders = orders.length;
      const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

      // Top products
      const productMap: Record<string, { name: string; qty: number; revenue: number }> = {};
      (orders as any[]).forEach(o => {
        (o.items || []).forEach((item: any) => {
          const k = item.productId;
          if (!productMap[k]) productMap[k] = { name: item.title || "", qty: 0, revenue: 0 };
          productMap[k].qty += item.quantity || 0;
          productMap[k].revenue += (item.price || 0) * (item.quantity || 0);
        });
      });
      const topProducts = Object.entries(productMap)
        .sort((a, b) => b[1].qty - a[1].qty)
        .slice(0, 5)
        .map(([id, v]) => ({ productId: id, ...v }));

      // Revenue by day (last 7 days)
      const dailyRevenue: Record<string, number> = {};
      for (let i = 6; i >= 0; i--) {
        const d = new Date(); d.setDate(now.getDate() - i);
        dailyRevenue[d.toISOString().split("T")[0]] = 0;
      }
      (orders as any[]).forEach(o => {
        const d = new Date(o.createdAt).toISOString().split("T")[0];
        if (dailyRevenue[d] !== undefined) dailyRevenue[d] += parseFloat(o.total || "0");
      });

      // Payment methods breakdown
      const paymentBreakdown: Record<string, number> = {};
      (orders as any[]).forEach(o => {
        const m = o.paymentMethod || "other";
        paymentBreakdown[m] = (paymentBreakdown[m] || 0) + 1;
      });

      // Order types
      const typeBreakdown: Record<string, number> = {};
      (orders as any[]).forEach(o => {
        const t = o.shippingMethod || o.orderType || "other";
        typeBreakdown[t] = (typeBreakdown[t] || 0) + 1;
      });

      const expenses = await ExpenseModel.find({ createdAt: { $gte: from } }).lean();
      const totalExpenses = (expenses as any[]).reduce((s, e) => s + e.amount, 0);

      res.json({
        totalRevenue, totalOrders, avgOrderValue,
        totalExpenses, netProfit: totalRevenue - totalExpenses,
        topProducts, dailyRevenue, paymentBreakdown, typeBreakdown,
        period,
      });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // Hourly sales breakdown (today)
  app.get("/api/admin/analytics/hourly", requireAdmin, async (_req, res) => {
    try {
      const today = new Date(); today.setHours(0, 0, 0, 0);
      const orders = await OrderModel.find({ createdAt: { $gte: today }, status: { $nin: ["cancelled"] } }).lean();
      const hourly: Record<number, { count: number; revenue: number }> = {};
      for (let h = 0; h < 24; h++) hourly[h] = { count: 0, revenue: 0 };
      (orders as any[]).forEach(o => {
        const h = new Date(o.createdAt).getHours();
        hourly[h].count += 1;
        hourly[h].revenue += parseFloat(o.total || "0");
      });
      res.json(hourly);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // EMPLOYEE PROFILES
  // ─────────────────────────────────────────────────────────────────────────────

  // Get all employee profiles
  app.get("/api/admin/employee-profiles", requireAdmin, async (_req, res) => {
    try {
      const profiles = await EmployeeProfileModel.find().sort({ createdAt: -1 }).lean();
      res.json(profiles);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // Get profile for a specific user
  app.get("/api/admin/employee-profiles/:userId", requireAdmin, async (req, res) => {
    try {
      let profile = await EmployeeProfileModel.findOne({ userId: req.params.userId }).lean();
      if (!profile) {
        // Auto-create empty profile
        profile = await EmployeeProfileModel.create({ userId: req.params.userId });
      }
      res.json(profile);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // Create or update employee profile
  app.put("/api/admin/employee-profiles/:userId", requireAdmin, async (req, res) => {
    try {
      const profile = await EmployeeProfileModel.findOneAndUpdate(
        { userId: req.params.userId },
        { $set: req.body },
        { upsert: true, new: true }
      );
      res.json(profile);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // Add salary payment record
  app.post("/api/admin/employee-profiles/:userId/salary", requireAdmin, async (req, res) => {
    try {
      const profile = await EmployeeProfileModel.findOneAndUpdate(
        { userId: req.params.userId },
        { $push: { salaryHistory: { ...req.body, paidAt: new Date() } } },
        { upsert: true, new: true }
      );
      res.json(profile);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // Get employee stats (attendance count, leave days, total shifts)
  app.get("/api/admin/employee-profiles/:userId/stats", requireAdmin, async (req, res) => {
    try {
      const { userId } = req.params;
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const monthStartStr = monthStart.toISOString().split("T")[0];

      const [attendance, leaves, shifts] = await Promise.all([
        AttendanceModel.find({ employeeId: userId, date: { $gte: monthStartStr } }).lean(),
        LeaveRequestModel.find({ employeeId: userId, status: "approved" }).lean(),
        EmployeeShiftModel.find({ employeeId: userId, date: { $gte: monthStartStr } }).lean(),
      ]);

      const present = (attendance as any[]).filter(a => a.status === "present" || a.status === "late").length;
      const late = (attendance as any[]).filter(a => a.isLate).length;
      const totalWorkMinutes = (attendance as any[]).reduce((s: number, a: any) => s + (a.workMinutes || 0), 0);
      const totalLeaveDays = (leaves as any[]).reduce((s: number, l: any) => s + (l.numberOfDays || 0), 0);

      res.json({
        presentDays: present,
        lateDays: late,
        totalWorkHours: Math.round(totalWorkMinutes / 60),
        totalLeaveDays,
        scheduledShifts: (shifts as any[]).length,
        attendanceRecords: attendance,
        leaveRequests: leaves,
        recentShifts: shifts,
      });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // SHIFT TEMPLATES
  // ─────────────────────────────────────────────────────────────────────────────

  app.get("/api/admin/shift-templates", requireAdmin, async (_req, res) => {
    try {
      const templates = await ShiftTemplateModel.find({ isActive: true }).sort({ startTime: 1 }).lean();
      res.json(templates);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.post("/api/admin/shift-templates", requireAdmin, async (req, res) => {
    try {
      const template = await ShiftTemplateModel.create(req.body);
      res.status(201).json(template);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.patch("/api/admin/shift-templates/:id", requireAdmin, async (req, res) => {
    try {
      const t = await ShiftTemplateModel.findByIdAndUpdate(req.params.id, req.body, { new: true });
      res.json(t);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.delete("/api/admin/shift-templates/:id", requireAdmin, async (req, res) => {
    try {
      await ShiftTemplateModel.findByIdAndUpdate(req.params.id, { isActive: false });
      res.json({ ok: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // EMPLOYEE SHIFTS (schedule)
  // ─────────────────────────────────────────────────────────────────────────────

  // Get shifts for a date range (weekly schedule)
  app.get("/api/admin/employee-shifts", requireAdmin, async (req, res) => {
    try {
      const { from, to, employeeId } = req.query as Record<string, string>;
      const filter: Record<string, any> = {};
      if (from && to) filter.date = { $gte: from, $lte: to };
      if (employeeId) filter.employeeId = employeeId;
      const shifts = await EmployeeShiftModel.find(filter).sort({ date: 1 }).lean();
      res.json(shifts);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // Assign a shift
  app.post("/api/admin/employee-shifts", requireAdmin, async (req, res) => {
    try {
      // Upsert: one shift per employee per date
      const shift = await EmployeeShiftModel.findOneAndUpdate(
        { employeeId: req.body.employeeId, date: req.body.date },
        { $set: req.body },
        { upsert: true, new: true }
      );
      res.status(201).json(shift);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // Update shift status
  app.patch("/api/admin/employee-shifts/:id", requireAdmin, async (req, res) => {
    try {
      const shift = await EmployeeShiftModel.findByIdAndUpdate(req.params.id, req.body, { new: true });
      res.json(shift);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // Delete a shift assignment
  app.delete("/api/admin/employee-shifts/:id", requireAdmin, async (req, res) => {
    try {
      await EmployeeShiftModel.findByIdAndDelete(req.params.id);
      res.json({ ok: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // RESTAURANT TABLES (Floor Plan)
  // ─────────────────────────────────────────────────────────────────────────────

  app.get("/api/admin/restaurant-tables", requireAdmin, async (_req, res) => {
    try {
      const tables = await RestaurantTableModel.find({ isActive: true }).sort({ section: 1, tableNumber: 1 }).lean();
      res.json(tables);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.post("/api/admin/restaurant-tables", requireAdmin, async (req, res) => {
    try {
      // Place new tables at a random spot if no position provided
      if (!req.body.posX) req.body.posX = 10 + Math.floor(Math.random() * 75);
      if (!req.body.posY) req.body.posY = 10 + Math.floor(Math.random() * 75);
      const table = await RestaurantTableModel.create(req.body);
      res.status(201).json(table);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.patch("/api/admin/restaurant-tables/:id", requireAdmin, async (req, res) => {
    try {
      const table = await RestaurantTableModel.findByIdAndUpdate(req.params.id, req.body, { new: true });
      res.json(table);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // Quick status update (free/occupied/reserved/cleaning)
  app.patch("/api/admin/restaurant-tables/:id/status", requireAdmin, async (req, res) => {
    try {
      const update: any = { status: req.body.status, notes: req.body.notes || "" };
      if (req.body.status === "occupied") {
        update.currentGuestCount = req.body.currentGuestCount || 0;
        update.occupiedSince = new Date();
      } else if (req.body.status === "free") {
        update.currentGuestCount = 0;
        update.occupiedSince = null;
        update.currentOrderId = "";
        update.reservationId = "";
      }
      const table = await RestaurantTableModel.findByIdAndUpdate(req.params.id, update, { new: true });
      res.json(table);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.delete("/api/admin/restaurant-tables/:id", requireAdmin, async (req, res) => {
    try {
      await RestaurantTableModel.findByIdAndUpdate(req.params.id, { isActive: false });
      res.json({ ok: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // WASTE LOGS
  // ─────────────────────────────────────────────────────────────────────────────

  app.get("/api/admin/waste-logs", requireAdmin, async (req, res) => {
    try {
      const { from, to } = req.query as Record<string, string>;
      const filter: Record<string, any> = {};
      if (from && to) filter.date = { $gte: from, $lte: to };
      const logs = await WasteLogModel.find(filter).sort({ date: -1 }).lean();
      res.json(logs);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.post("/api/admin/waste-logs", requireAdmin, async (req: AuthRequest, res) => {
    try {
      const totalCost = (req.body.items || []).reduce((s: number, i: any) => s + (i.totalCost || 0), 0);
      const log = await WasteLogModel.create({
        ...req.body,
        totalCost,
        recordedBy: req.user?.name || req.user?.phone || "",
      });
      res.status(201).json(log);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.delete("/api/admin/waste-logs/:id", requireAdmin, async (req, res) => {
    try {
      await WasteLogModel.findByIdAndDelete(req.params.id);
      res.json({ ok: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // ERP — FINANCIAL MANAGEMENT
  // ─────────────────────────────────────────────────────────────────────────────

  app.get("/api/admin/erp/financials", requireAdmin, async (req, res) => {
    try {
      const { period = "month" } = req.query as any;
      const now = new Date();
      let from: Date;
      if (period === "year")    { from = new Date(now.getFullYear(), 0, 1); }
      else if (period === "quarter") { const q = Math.floor(now.getMonth() / 3); from = new Date(now.getFullYear(), q * 3, 1); }
      else { from = new Date(now.getFullYear(), now.getMonth(), 1); }

      const paidStatuses = ["paid", "delivered", "processing", "shipped", "ready_for_pickup"];

      const orders = await OrderModel.find({ createdAt: { $gte: from }, status: { $in: paidStatuses } }).lean();
      const allOrders = await OrderModel.find({ createdAt: { $gte: from } }).lean();

      const grossRevenue = (orders as any[]).reduce((s, o) => s + parseFloat(o.subtotal || o.total || "0"), 0);
      const totalRevenue = (orders as any[]).reduce((s, o) => s + parseFloat(o.total || "0"), 0);
      const vatCollected = (orders as any[]).reduce((s, o) => s + parseFloat(o.vatAmount || "0"), 0);
      const shippingRevenue = (orders as any[]).reduce((s, o) => s + parseFloat(o.shippingCost || "0"), 0);
      const cogs = (orders as any[]).reduce((s, o) => {
        return s + (o.items || []).reduce((si: number, it: any) => si + (parseFloat(it.cost || "0") * (it.quantity || 1)), 0);
      }, 0);
      const grossProfit = totalRevenue - vatCollected - cogs;

      const expenses = await ExpenseModel.find({ date: { $gte: from } }).lean();
      const totalExpenses = (expenses as any[]).reduce((s, e) => s + e.amount, 0);
      const expensesByCategory: Record<string, number> = {};
      (expenses as any[]).forEach(e => { expensesByCategory[e.category] = (expensesByCategory[e.category] || 0) + e.amount; });

      const netProfit = grossProfit - totalExpenses;

      const cancelledOrders = (allOrders as any[]).filter(o => o.status === "cancelled").length;
      const refundedAmount = (allOrders as any[]).filter(o => o.status === "cancelled").reduce((s, o) => s + parseFloat(o.total || "0"), 0);

      const paymentBreakdown: Record<string, number> = {};
      (orders as any[]).forEach(o => { const m = o.paymentMethod || "other"; paymentBreakdown[m] = (paymentBreakdown[m] || 0) + parseFloat(o.total || "0"); });

      res.json({
        period, from: from.toISOString(),
        revenue: { gross: grossRevenue, total: totalRevenue, vat: vatCollected, shipping: shippingRevenue },
        cogs,
        grossProfit,
        expenses: { total: totalExpenses, byCategory: expensesByCategory, count: (expenses as any[]).length },
        netProfit,
        margin: totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(1) : "0",
        orders: { count: (orders as any[]).length, cancelled: cancelledOrders, refunded: refundedAmount },
        paymentBreakdown,
      });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.get("/api/admin/erp/monthly-trend", requireAdmin, async (req, res) => {
    try {
      const now = new Date();
      const months: { label: string; revenue: number; expenses: number; profit: number; orders: number }[] = [];
      const paidStatuses = ["paid", "delivered", "processing", "shipped", "ready_for_pickup"];

      for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
        const label = d.toLocaleDateString("ar-SA", { month: "short", year: "2-digit" });

        const [orders, expenses] = await Promise.all([
          OrderModel.find({ createdAt: { $gte: d, $lte: end }, status: { $in: paidStatuses } }).lean(),
          ExpenseModel.find({ date: { $gte: d, $lte: end } }).lean(),
        ]);

        const revenue = (orders as any[]).reduce((s, o) => s + parseFloat(o.total || "0"), 0);
        const expTotal = (expenses as any[]).reduce((s, e) => s + e.amount, 0);
        months.push({ label, revenue: Math.round(revenue), expenses: Math.round(expTotal), profit: Math.round(revenue - expTotal), orders: (orders as any[]).length });
      }

      res.json(months);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.get("/api/admin/erp/vat-report", requireAdmin, async (req, res) => {
    try {
      const { year = new Date().getFullYear(), quarter } = req.query as any;
      let from: Date, to: Date;
      if (quarter) {
        const q = parseInt(quarter) - 1;
        from = new Date(parseInt(year), q * 3, 1);
        to   = new Date(parseInt(year), q * 3 + 3, 0, 23, 59, 59);
      } else {
        from = new Date(parseInt(year), 0, 1);
        to   = new Date(parseInt(year), 11, 31, 23, 59, 59);
      }
      const paidStatuses = ["paid", "delivered", "processing", "shipped", "ready_for_pickup"];
      const orders = await OrderModel.find({ createdAt: { $gte: from, $lte: to }, status: { $in: paidStatuses } }).lean();

      const taxableRevenue = (orders as any[]).reduce((s, o) => s + parseFloat(o.subtotal || o.total || "0"), 0);
      const vatCollected   = (orders as any[]).reduce((s, o) => s + parseFloat(o.vatAmount || "0"), 0);
      const totalWithVat   = (orders as any[]).reduce((s, o) => s + parseFloat(o.total || "0"), 0);

      const byMonth: Record<string, { taxable: number; vat: number; orders: number }> = {};
      (orders as any[]).forEach(o => {
        const key = new Date(o.createdAt).toLocaleDateString("ar-SA", { month: "long", year: "numeric" });
        if (!byMonth[key]) byMonth[key] = { taxable: 0, vat: 0, orders: 0 };
        byMonth[key].taxable += parseFloat(o.subtotal || o.total || "0");
        byMonth[key].vat     += parseFloat(o.vatAmount || "0");
        byMonth[key].orders  += 1;
      });

      res.json({ from: from.toISOString(), to: to.toISOString(), taxableRevenue, vatCollected, totalWithVat, orderCount: (orders as any[]).length, byMonth });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.patch("/api/admin/expenses/:id", requireAdmin, async (req: AuthRequest, res) => {
    try {
      const exp = await ExpenseModel.findByIdAndUpdate(req.params.id, { $set: req.body }, { new: true });
      if (!exp) return res.status(404).json({ error: "غير موجود" });
      res.json({ ...exp.toObject(), id: String(exp._id) });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
}
