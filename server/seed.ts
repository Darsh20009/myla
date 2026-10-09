import { storage } from "./storage";
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";
import { CategoryModel, ProductModel, StoreSettingsModel, UserModel, BranchModel } from "./models";
import { defaultAbayaProducts } from "./seed-abaya-products";

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buffer = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buffer.toString("hex")}.${salt}`;
}

export async function seed() {
  // Remove old phone numbers if exist
  await UserModel.deleteMany({ phone: "0532441566" });
  await UserModel.deleteMany({ phone: "0567326086" });
  await UserModel.deleteMany({ phone: "567326086" });
  await UserModel.deleteMany({ phone: "567891011" });
  // Remove legacy phone numbers (one-time cleanup only)
  await UserModel.deleteMany({ phone: "0552469643", role: "admin" });

  // Only bootstrap or rotate admin credentials when the password secret is
  // explicitly configured. Existing admin accounts remain unchanged otherwise.
  const defaultBootstrapAdminPhone = "0507378047";
  const normalizeBootstrapPhone = (value: string) => {
    let digits = value.replace(/\D/g, "");
    if (digits.startsWith("966")) digits = digits.substring(3);
    if (digits.startsWith("0")) digits = digits.substring(1);
    if (!/^5\d{8}$/.test(digits)) {
      throw new Error("ADMIN_BOOTSTRAP_PHONE must be a valid Saudi mobile number.");
    }
    return `0${digits}`;
  };
  const configuredBootstrapPhone = process.env.ADMIN_BOOTSTRAP_PHONE?.trim();
  const bootstrapPhone = configuredBootstrapPhone
    ? normalizeBootstrapPhone(configuredBootstrapPhone)
    : defaultBootstrapAdminPhone;
  const promoteExistingTarget = process.env.ADMIN_BOOTSTRAP_PROMOTE_EXISTING === "true";
  const adminPassword = process.env.ADMIN_BOOTSTRAP_PASSWORD;
  const usableAdminPassword = adminPassword && adminPassword.length >= 12
    ? adminPassword
    : undefined;
  if (adminPassword && !usableAdminPassword) {
    console.error("[AdminBootstrap] password must be at least 12 characters; credential rotation skipped.");
  }
  const legacyAdmin = await UserModel.findOne({
    phone: defaultBootstrapAdminPhone,
    role: "admin",
  }).select("_id phone role username").lean();
  const targetAccounts = await UserModel.find({
    $or: [
      { phone: bootstrapPhone },
      { username: bootstrapPhone },
      { phone: new RegExp(`${bootstrapPhone.slice(1)}$`) },
      { username: new RegExp(`${bootstrapPhone.slice(1)}$`) },
    ],
  }).select("_id phone role username isActive").lean();
  const targetAccount = targetAccounts.length === 1 ? targetAccounts[0] : null;
  const canUseTargetAccount = Boolean(
    targetAccount &&
    (targetAccount.role === "admin" ||
      (promoteExistingTarget && targetAccount.role === "customer" && targetAccount.isActive !== false)),
  );
  const targetBootstrapAccount = canUseTargetAccount ? targetAccount : null;
  const bootstrapAccount = targetBootstrapAccount || legacyAdmin;
  const targetIsDifferentAccount = targetAccounts.length > 1 || targetAccounts.some(
    (account) => !bootstrapAccount || String(account._id) !== String(bootstrapAccount._id),
  );
  const targetIsInactiveCustomer = Boolean(
    targetAccount?.role === "customer" &&
    promoteExistingTarget &&
    targetAccount.isActive === false,
  );
  const existingAdmin = Boolean(legacyAdmin || targetBootstrapAccount?.role === "admin");

  if (!usableAdminPassword && !existingAdmin) {
    throw new Error("Set ADMIN_BOOTSTRAP_PASSWORD (at least 12 characters) to create the initial admin account.");
  }

  if (usableAdminPassword) {
    if (targetIsInactiveCustomer) {
      console.error("[AdminBootstrap] target customer account is inactive; promotion skipped.");
    } else if (targetIsDifferentAccount) {
      console.error("[AdminBootstrap] target phone belongs to another account; credential rotation skipped.");
    } else {
      console.log("Seeding Myla admin user from configured bootstrap credentials...");
      const passwordHash = await hashPassword(usableAdminPassword);
      const filter = bootstrapAccount
        ? { _id: bootstrapAccount._id, role: bootstrapAccount.role }
        : { phone: bootstrapPhone, role: "admin" as const };
      try {
        const adminResult = await UserModel.findOneAndUpdate(
          filter,
          {
            $set: {
              phone: bootstrapPhone,
              username: bootstrapPhone,
              role: "admin",
              loginType: "both",
              isActive: true,
              mustChangePassword: false,
              password: passwordHash,
              permissions: [
                "orders.view", "orders.edit", "orders.refund",
                "products.view", "products.edit",
                "customers.view", "wallet.adjust",
                "reports.view", "staff.manage",
                "pos.access", "settings.manage"
              ],
            },
            $unset: {
              passwordResetCode: 1,
              passwordResetCodeExpires: 1,
              passwordResetAttempts: 1,
            },
            $setOnInsert: {
              name: "Myla",
              email: "info@myla.sa",
              walletBalance: "0",
              addresses: [],
              loyaltyPoints: 0,
              loyaltyTier: "bronze",
              totalSpent: 0,
              phoneDiscountEligible: false,
            },
          },
          { upsert: true, new: false }
        );
        if (!adminResult) {
          console.log("Admin user created with configured bootstrap credentials.");
        } else if (promoteExistingTarget && targetAccount?.role === "customer") {
          console.log("Existing customer account promoted to admin with configured bootstrap credentials.");
        } else {
          console.log("Admin user updated with configured bootstrap credentials.");
        }
      } catch (error: any) {
        if (error?.code === 11000) {
          console.error("[AdminBootstrap] target phone is already assigned; credential rotation skipped.");
        } else {
          throw error;
        }
      }
    }
  } else {
    console.log("No usable ADMIN_BOOTSTRAP_PASSWORD configured; preserving existing admin credentials.");
  }

  const defaultCategoryData: Record<string, { nameAr: string; image: string }> = {
    abayas:      { nameAr: "عبايات",          image: "https://images.unsplash.com/photo-1608042314453-ae338d682c93?w=400&h=500&fit=crop&auto=format" },
    caftans:     { nameAr: "قفاطين",          image: "https://images.unsplash.com/photo-1585487000160-6ebcfceb0d03?w=400&h=500&fit=crop&auto=format" },
    sets:        { nameAr: "أطقم",            image: "https://images.unsplash.com/photo-1583391733956-6c78276477e2?w=400&h=500&fit=crop&auto=format" },
    accessories: { nameAr: "إكسسوارات",       image: "https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=400&h=500&fit=crop&auto=format" },
    newseason:   { nameAr: "تشكيلة الموسم",  image: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=500&fit=crop&auto=format" },
    exclusive:   { nameAr: "حصري",            image: "https://images.unsplash.com/photo-1591369822096-ffd140ec948f?w=400&h=500&fit=crop&auto=format" },
  };

  const categories = await storage.getCategories();
  if (categories.length === 0) {
    await CategoryModel.insertMany([
      { name: "Abayas",      slug: "abayas",      nameAr: "عبايات",         image: defaultCategoryData.abayas.image },
      { name: "Caftans",     slug: "caftans",     nameAr: "قفاطين",         image: defaultCategoryData.caftans.image },
      { name: "Sets",        slug: "sets",        nameAr: "أطقم",           image: defaultCategoryData.sets.image },
      { name: "Accessories", slug: "accessories", nameAr: "إكسسوارات",      image: defaultCategoryData.accessories.image },
      { name: "New Season",  slug: "newseason",   nameAr: "تشكيلة الموسم", image: defaultCategoryData.newseason.image },
      { name: "Exclusive",   slug: "exclusive",   nameAr: "حصري",           image: defaultCategoryData.exclusive.image },
    ]);
    console.log("Myla abaya categories seeded");
  } else {
    for (const cat of categories) {
      const def = defaultCategoryData[cat.slug];
      if (def && (!cat.image || !cat.nameAr)) {
        await storage.updateCategory(cat.id, {
          nameAr: cat.nameAr || def.nameAr,
          image: cat.image || def.image,
        });
      }
    }
  }

  const abayaCategory = await CategoryModel.findOne({ slug: "abayas" }).lean();
  const storeSettings = await StoreSettingsModel.findOne({ key: "main" })
    .select("mylaAbayaCatalogSeedVersion")
    .lean() as any;
  if (abayaCategory && Number(storeSettings?.mylaAbayaCatalogSeedVersion || 0) < 1) {
    const existingProducts = await ProductModel.find({}, { name: 1 }).lean();
    const existingNames = new Set(existingProducts.map((product: any) => String(product.name || "").trim()));
    const missingProducts = defaultAbayaProducts.filter((product) => !existingNames.has(product.name.trim()));
    if (missingProducts.length > 0) {
      const categoryId = String(abayaCategory._id);
      const products = missingProducts.map((product) => ({
        ...product,
        name: product.name.trim(),
        categoryId,
        categoryIds: [categoryId],
        images: product.images.map((image) =>
          image.startsWith("/") ? `https://myla-abayas.store${image}` : image
        ),
        variants: product.variants.map((variant) => ({
          ...variant,
          image: variant.image?.startsWith("/")
            ? `https://myla-abayas.store${variant.image}`
            : variant.image,
        })),
      }));
      await ProductModel.insertMany(products as any[]);
      console.log(`[CatalogSeed] Restored ${products.length} missing Myla abaya products.`);
    } else {
      console.log("[CatalogSeed] Existing Myla abaya catalog found; skipped import.");
    }
    await StoreSettingsModel.updateOne(
      { key: "main" },
      { $set: { mylaAbayaCatalogSeedVersion: 1 } },
      { upsert: true },
    );
  }

  // ─── Default branch ──────────────────────────────────────────────────────
  const branches = await BranchModel.find().lean();
  if (branches.length === 0) {
    await BranchModel.insertMany([
      {
        name: "الفرع الرئيسي - Myla",
        nameEn: "Myla Main Branch",
        address: "الرياض، المملكة العربية السعودية",
        phone: "",
        isActive: true,
        location: { lat: 24.7136, lng: 46.6753 },
      },
    ]);
    console.log("Default Myla branch seeded");
  }
}
