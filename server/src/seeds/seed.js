import bcrypt from 'bcryptjs';
import { 
  User, 
  Vendor, 
  Category, 
  Product, 
  Address, 
  Cart, 
  Wishlist, 
  AuditLog 
} from '../models/index.js';
import { ROLES, VENDOR_STATUS } from '../constants/index.js';
import { connectDB, disconnectDB } from '../config/db.js';
import { env } from '../config/env.js';

export const runSeed = async () => {
  console.log('🌱 Starting SmartCart AI Database Seeding...');
  await connectDB();

  try {
    // 1. Clear existing data
    console.log('🧹 Clearing existing collections...');
    await Promise.all([
      User.deleteMany({}),
      Vendor.deleteMany({}),
      Category.deleteMany({}),
      Product.deleteMany({}),
      Address.deleteMany({}),
      Cart.deleteMany({}),
      Wishlist.deleteMany({}),
      AuditLog.deleteMany({}),
    ]);

    // 2. Hash shared passwords
    const salt = await bcrypt.genSalt(env.BCRYPT_SALT_ROUNDS);
    const adminPasswordHash = await bcrypt.hash('Admin@123456', salt);
    const vendorPasswordHash = await bcrypt.hash('Vendor@123456', salt);
    const buyerPasswordHash = await bcrypt.hash('Buyer@123456', salt);

    // 3. Seed Users
    console.log('👤 Seeding Users...');
    const adminUser = await User.create({
      name: 'Super Administrator',
      email: 'admin@smartcart.com',
      passwordHash: adminPasswordHash,
      role: ROLES.ADMIN,
      isActive: true,
    });

    const vendor1User = await User.create({
      name: 'Arjun Verma (TechWorld)',
      email: 'techworld@smartcart.com',
      passwordHash: vendorPasswordHash,
      role: ROLES.VENDOR,
      isActive: true,
    });

    const vendor2User = await User.create({
      name: 'Ananya Sen (FashionHub)',
      email: 'fashionhub@smartcart.com',
      passwordHash: vendorPasswordHash,
      role: ROLES.VENDOR,
      isActive: true,
    });

    const vendor3User = await User.create({
      name: 'Vikram Malhotra (HomeStyle)',
      email: 'homestyle@smartcart.com',
      passwordHash: vendorPasswordHash,
      role: ROLES.VENDOR,
      isActive: true,
    });

    const pendingVendorUser = await User.create({
      name: 'Rohan Mehra (GadgetDen)',
      email: 'gadgetden@smartcart.com',
      passwordHash: vendorPasswordHash,
      role: ROLES.VENDOR,
      isActive: true,
    });

    const buyerUser = await User.create({
      name: 'Rahul Sharma',
      email: 'buyer@smartcart.com',
      passwordHash: buyerPasswordHash,
      role: ROLES.BUYER,
      isActive: true,
    });

    const buyer2User = await User.create({
      name: 'Priya Patel',
      email: 'priya@smartcart.com',
      passwordHash: buyerPasswordHash,
      role: ROLES.BUYER,
      isActive: true,
    });

    // 4. Seed Vendors
    console.log('🏪 Seeding Vendors...');
    const vendorTech = await Vendor.create({
      userId: vendor1User._id,
      storeName: 'TechWorld Electronics',
      slug: 'techworld-electronics',
      description: 'Authorized retailer for laptops, computer hardware, audio gear and accessories.',
      contactEmail: 'contact@techworld.store',
      contactPhone: '+91 98765 43210',
      address: 'Shop 104, Nehru Place IT Hub, New Delhi',
      approvalStatus: VENDOR_STATUS.APPROVED,
      approvalDate: new Date(),
      commissionRate: 10,
    });

    const vendorFashion = await Vendor.create({
      userId: vendor2User._id,
      storeName: 'FashionHub Apparel',
      slug: 'fashionhub-apparel',
      description: 'Trendy, sustainable streetwear, corporate attire and designer fashion.',
      contactEmail: 'hello@fashionhub.store',
      contactPhone: '+91 98765 43211',
      address: '22 Bandra West, Linking Road, Mumbai',
      approvalStatus: VENDOR_STATUS.APPROVED,
      approvalDate: new Date(),
      commissionRate: 12,
    });

    const vendorHome = await Vendor.create({
      userId: vendor3User._id,
      storeName: 'HomeStyle Modern Living',
      slug: 'homestyle-modern-living',
      description: 'Contemporary furniture, smart lighting, kitchen utilities and home decor.',
      contactEmail: 'sales@homestyle.store',
      contactPhone: '+91 98765 43212',
      address: '15 Indiranagar 100ft Road, Bengaluru',
      approvalStatus: VENDOR_STATUS.APPROVED,
      approvalDate: new Date(),
      commissionRate: 8,
    });

    // Pending vendor for testing approval workflow in admin dashboard
    await Vendor.create({
      userId: pendingVendorUser._id,
      storeName: 'GadgetDen NextGen',
      slug: 'gadgetden-nextgen',
      description: 'Smart home IoT products, drones, and gaming gear.',
      contactEmail: 'partner@gadgetden.store',
      contactPhone: '+91 98765 43213',
      address: 'Gachibowli Tech Park, Hyderabad',
      approvalStatus: VENDOR_STATUS.PENDING,
      commissionRate: 10,
    });

    // 5. Seed Categories
    console.log('🏷️ Seeding Categories...');
    const catLaptops = await Category.create({
      name: 'Laptops & Computers',
      slug: 'laptops-computers',
      description: 'High-performance laptops, ultrabooks, coding workstations and desktops.',
      icon: 'Laptop',
      displayOrder: 1,
    });

    const catAudio = await Category.create({
      name: 'Audio & Headphones',
      slug: 'audio-headphones',
      description: 'Noise cancelling headphones, true wireless earbuds and studio monitors.',
      icon: 'Headphones',
      displayOrder: 2,
    });

    const catPhones = await Category.create({
      name: 'Smartphones & Tablets',
      slug: 'smartphones-tablets',
      description: 'Flagship 5G phones, tablets, e-readers and smartwatches.',
      icon: 'Smartphone',
      displayOrder: 3,
    });

    const catFashion = await Category.create({
      name: 'Fashion & Apparel',
      slug: 'fashion-apparel',
      description: 'Premium casual wear, shirts, sneakers, and lifestyle accessories.',
      icon: 'Shirt',
      displayOrder: 4,
    });

    const catHome = await Category.create({
      name: 'Home & Kitchen',
      slug: 'home-kitchen',
      description: 'Ergonomic chairs, smart desks, coffee makers and ambient lighting.',
      icon: 'Home',
      displayOrder: 5,
    });

    // 6. Seed Products (Monetary values in integer paise: 1 INR = 100 paise)
    console.log('📦 Seeding Products...');
    const productsData = [
      // TechWorld Products
      {
        vendorId: vendorTech._id,
        categoryId: catLaptops._id,
        name: 'ZenithPro 15 Ultra Laptop (Core i7 13th Gen, 16GB RAM, 1TB NVMe)',
        slug: 'zenithpro-15-ultra-laptop',
        description: 'Engineered for developers and creators. Features a brilliant 15.6" 2.8K OLED 120Hz display, Intel Core i7-13700H, 16GB DDR5 RAM, and 1TB PCIe Gen4 SSD. Up to 11 hours battery life.',
        price: 7499900, // ₹74,999.00
        originalPrice: 8999900, // ₹89,999.00
        stock: 25,
        images: [
          'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=800&auto=format&fit=crop&q=80',
          'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800&auto=format&fit=crop&q=80',
        ],
        specifications: [
          { key: 'Processor', value: 'Intel Core i7-13700H (14 Cores, up to 5.0 GHz)' },
          { key: 'RAM', value: '16GB LPDDR5 5200MHz' },
          { key: 'Storage', value: '1TB M.2 NVMe SSD' },
          { key: 'Display', value: '15.6" 2.8K OLED, 100% DCI-P3' },
          { key: 'Weight', value: '1.48 kg' },
          { key: 'Operating System', value: 'Windows 11 Home' },
        ],
        tags: ['laptop', 'programming', 'developer', 'intel', 'oled', 'ultrabook', 'coding'],
        averageRating: 4.8,
        totalReviews: 42,
        isFeatured: true,
      },
      {
        vendorId: vendorTech._id,
        categoryId: catLaptops._id,
        name: 'CoderBook Air 14 (Ryzen 7 7730U, 16GB RAM, 512GB SSD)',
        slug: 'coderbook-air-14',
        description: 'Budget-friendly powerhouse for programming students and remote professionals. Full aluminum chassis, backlit keyboard with 1.5mm key travel, and fast charge support.',
        price: 4899900, // ₹48,999.00 (Matches "laptop under ₹50,000 for programming")
        originalPrice: 5899900,
        stock: 35,
        images: [
          'https://images.unsplash.com/photo-1525547719571-a2d4ac8945e2?w=800&auto=format&fit=crop&q=80',
        ],
        specifications: [
          { key: 'Processor', value: 'AMD Ryzen 7 7730U (8 Cores, 16 Threads)' },
          { key: 'RAM', value: '16GB DDR4 3200MHz' },
          { key: 'Storage', value: '512GB NVMe M.2 SSD' },
          { key: 'Display', value: '14" FHD IPS Anti-Glare 300 nits' },
          { key: 'Battery', value: '54Wh (Up to 9 hours)' },
        ],
        tags: ['laptop', 'budget', 'programming', 'student', 'ryzen', 'amd', 'portable'],
        averageRating: 4.6,
        totalReviews: 28,
        isFeatured: true,
      },
      {
        vendorId: vendorTech._id,
        categoryId: catAudio._id,
        name: 'AcoustiMax Studio Wireless ANC Headphones',
        slug: 'acoustimax-studio-wireless-anc-headphones',
        description: 'Industry-leading Active Noise Cancellation with 40mm beryllium drivers, spatial audio tracking, dual beamforming microphones, and 45-hour playback time.',
        price: 1499900, // ₹14,999.00
        originalPrice: 1999900,
        stock: 50,
        images: [
          'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&auto=format&fit=crop&q=80',
          'https://images.unsplash.com/photo-1484704849700-f032a568e944?w=800&auto=format&fit=crop&q=80',
        ],
        specifications: [
          { key: 'Driver Size', value: '40mm Custom Dynamic Drivers' },
          { key: 'Noise Cancellation', value: 'Hybrid Active Noise Cancellation (4 mics)' },
          { key: 'Battery Life', value: '45 Hours (ANC off), 32 Hours (ANC on)' },
          { key: 'Connectivity', value: 'Bluetooth 5.3, Multipoint, 3.5mm AUX' },
          { key: 'Charging', value: 'USB-C Fast Charging (10 mins = 5 hours)' },
        ],
        tags: ['headphones', 'anc', 'wireless', 'bluetooth', 'audio', 'studio', 'office'],
        averageRating: 4.7,
        totalReviews: 89,
        isFeatured: true,
      },
      {
        vendorId: vendorTech._id,
        categoryId: catAudio._id,
        name: 'EchoBuds Pro True Wireless Earbuds',
        slug: 'echobuds-pro-tws-earbuds',
        description: 'Compact earbuds with deep punchy bass, transparency mode, wireless Qi charging case, and IPX5 water resistance for workouts and daily transit.',
        price: 499900, // ₹4,999.00
        originalPrice: 699900,
        stock: 60,
        images: [
          'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=800&auto=format&fit=crop&q=80',
        ],
        specifications: [
          { key: 'Water Resistance', value: 'IPX5 Sweat & Water Resistant' },
          { key: 'Battery Life', value: '7 hours (buds) + 21 hours (case)' },
          { key: 'Audio Codecs', value: 'AAC, SBC, aptX Low Latency' },
        ],
        tags: ['earbuds', 'tws', 'audio', 'wireless', 'workout', 'bass'],
        averageRating: 4.4,
        totalReviews: 34,
      },

      // FashionHub Products
      {
        vendorId: vendorFashion._id,
        categoryId: catFashion._id,
        name: 'UrbanClassic Premium Oxford Cotton Shirt',
        slug: 'urbanclassic-premium-oxford-shirt',
        description: '100% GOTS-certified organic combed cotton with button-down collar, tailored fit, and mother-of-pearl buttons. Ideal for office work and smart casual weekends.',
        price: 199900, // ₹1,999.00
        originalPrice: 299900,
        stock: 80,
        images: [
          'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=800&auto=format&fit=crop&q=80',
        ],
        specifications: [
          { key: 'Fabric', value: '100% Organic Oxford Cotton' },
          { key: 'Fit', value: 'Regular Contemporary Fit' },
          { key: 'Care Instructions', value: 'Machine wash cold, tumble dry low' },
        ],
        tags: ['fashion', 'shirt', 'cotton', 'office', 'casual', 'sustainable'],
        averageRating: 4.5,
        totalReviews: 19,
      },
      {
        vendorId: vendorFashion._id,
        categoryId: catFashion._id,
        name: 'StreetVibe All-Weather Hooded Parka Jacket',
        slug: 'streetvibe-hooded-parka-jacket',
        description: 'Windproof, water-resistant insulated parka jacket featuring fleece-lined hood, waterproof storm flaps, and 6 utility pockets.',
        price: 449900, // ₹4,499.00
        originalPrice: 599900,
        stock: 40,
        images: [
          'https://images.unsplash.com/photo-1544022613-e87ca75a784a?w=800&auto=format&fit=crop&q=80',
        ],
        specifications: [
          { key: 'Material', value: '100% Recycled Polyester Shell' },
          { key: 'Weatherproofing', value: 'DWR 10,000mm Waterproof Rating' },
        ],
        tags: ['jacket', 'outerwear', 'fashion', 'winter', 'waterproof'],
        averageRating: 4.9,
        totalReviews: 14,
      },

      // HomeStyle Products
      {
        vendorId: vendorHome._id,
        categoryId: catHome._id,
        name: 'ErgoFlex Ergonomic Mesh High-Back Office Chair',
        slug: 'ergoflex-ergonomic-mesh-chair',
        description: 'Designed for long hours at desk. Breathable Korean mesh backrest, 3D adjustable armrests, dynamic lumbar support, and synchronized tilt mechanism with class-4 gas lift.',
        price: 1299900, // ₹12,999.00
        originalPrice: 1799900,
        stock: 20,
        images: [
          'https://images.unsplash.com/photo-1580481077195-c22ae453478f?w=800&auto=format&fit=crop&q=80',
        ],
        specifications: [
          { key: 'Weight Capacity', value: 'Up to 150 kg' },
          { key: 'Armrests', value: '3D Height & Angle Adjustable' },
          { key: 'Base', value: 'Polished Heavy Duty Aluminum Star Base' },
          { key: 'Warranty', value: '3 Years Manufacturer Warranty' },
        ],
        tags: ['furniture', 'chair', 'office', 'ergonomic', 'desk', 'workstation'],
        averageRating: 4.8,
        totalReviews: 52,
        isFeatured: true,
      },
      {
        vendorId: vendorHome._id,
        categoryId: catHome._id,
        name: 'LuminaSmart RGB Ambient LED Monitor Lightbar',
        slug: 'luminasmart-rgb-monitor-lightbar',
        description: 'Asymmetric optical design prevents screen glare. Touch controls for color temperature (2700K - 6500K), auto-dimming ambient light sensor, and rear RGB backlight.',
        price: 299900, // ₹2,999.00
        originalPrice: 399900,
        stock: 45,
        images: [
          'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=800&auto=format&fit=crop&q=80',
        ],
        specifications: [
          { key: 'Power Input', value: '5V / 2A USB-C' },
          { key: 'Color Temperature', value: '2700K to 6500K Adjustable' },
          { key: 'Mounting', value: 'Fits curved and flat monitors up to 35mm thick' },
        ],
        tags: ['desk', 'light', 'lamp', 'office', 'monitor', 'rgb'],
        averageRating: 4.6,
        totalReviews: 38,
      },
    ];

    const seededProducts = await Product.insertMany(productsData);

    // 7. Seed Saved Addresses for Buyer
    console.log('📍 Seeding Addresses...');
    await Address.create([
      {
        buyerId: buyerUser._id,
        recipientName: 'Rahul Sharma',
        phone: '+91 98111 22334',
        street: 'Flat 402, Sunshine Heights, Andheri West',
        city: 'Mumbai',
        state: 'Maharashtra',
        postalCode: '400053',
        country: 'India',
        isDefault: true,
      },
      {
        buyerId: buyerUser._id,
        recipientName: 'Rahul Sharma (Office)',
        phone: '+91 98111 22334',
        street: 'WeWork Prestige Tech Park, Marathahalli',
        city: 'Bengaluru',
        state: 'Karnataka',
        postalCode: '560103',
        country: 'India',
        isDefault: false,
      },
    ]);

    // 8. Seed Default Cart & Wishlist for Buyer
    console.log('🛒 Seeding Cart & Wishlist...');
    await Cart.create({
      buyerId: buyerUser._id,
      items: [
        {
          productId: seededProducts[0]._id, // ZenithPro Laptop (TechWorld)
          quantity: 1,
        },
        {
          productId: seededProducts[4]._id, // Oxford Shirt (FashionHub)
          quantity: 2,
        },
      ],
    });

    await Wishlist.create({
      buyerId: buyerUser._id,
      products: [seededProducts[2]._id, seededProducts[6]._id], // Headphones and Chair
    });

    // 9. Record initial audit log
    await AuditLog.create({
      actorId: adminUser._id,
      actorEmail: adminUser.email,
      actorRole: ROLES.ADMIN,
      action: 'SYSTEM_DATABASE_SEEDED',
      targetResource: {
        resourceType: 'Database',
        resourceId: 'smartcart_ai',
      },
      details: {
        categories: 5,
        vendors: 4,
        products: seededProducts.length,
        users: 7,
      },
    });

    console.log('--------------------------------------------------');
    console.log('🎉 Database seeding completed successfully!');
    console.log(`📦 Seeded: ${seededProducts.length} Products across 5 Categories & 3 Approved Vendors`);
    console.log('--------------------------------------------------');
    console.log('Credentials Summary:');
    console.log('👑 Admin : admin@smartcart.com   | Admin@123456');
    console.log('🏪 Vendor: techworld@smartcart.com | Vendor@123456');
    console.log('🛍️ Buyer : buyer@smartcart.com    | Buyer@123456');
    console.log('--------------------------------------------------');

    return { success: true, productCount: seededProducts.length };
  } catch (error) {
    console.error('❌ Seeding failed with error:', error);
    throw error;
  } finally {
    await disconnectDB();
  }
};

// Execute if run directly from CLI
if (process.argv[1]?.endsWith('seed.js')) {
  runSeed().catch(() => process.exit(1));
}
