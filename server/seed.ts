import { storage } from "./storage";
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";
import { CategoryModel, UserModel, BranchModel } from "./models";

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
  // Clean up stale admin accounts before re-seeding
  await UserModel.deleteMany({ phone: "0552469643", role: "admin" });
  await UserModel.deleteMany({ phone: "0507378047", role: "admin" });

  // Create Myla admin user
  console.log("Seeding Myla admin user...");
  const password = await hashPassword("1234567890");
  await storage.createUser({
    phone: "0507378047",
    password,
    role: "admin",
    name: "Myla",
    username: "0507378047",
    email: "info@myla.sa",
    walletBalance: "0",
    addresses: [],
    permissions: [
      "orders.view", "orders.edit", "orders.refund",
      "products.view", "products.edit",
      "customers.view", "wallet.adjust",
      "reports.view", "staff.manage",
      "pos.access", "settings.manage"
    ],
    loginType: "both",
    isActive: true,
    mustChangePassword: false,
    loyaltyPoints: 0,
    loyaltyTier: "bronze",
    totalSpent: 0,
    phoneDiscountEligible: false
  });
  console.log("Admin user created with phone 0507378047 and password 1234567890");

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
