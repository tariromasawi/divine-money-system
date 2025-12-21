import { db } from "./db";
import { products } from "@shared/schema";
import { eq } from "drizzle-orm";

const SEED_PRODUCTS = [
  {
    name: "Abundance Manifestation Masterclass",
    description: "A comprehensive online course teaching the laws of attraction, manifestation techniques, and abundance mindset. Includes 12 video modules, workbooks, and lifetime access.",
    price: "97.00",
    currency: "USD",
    category: "Online Course",
    stockQuantity: 999,
    isActive: true,
    deliveryContent: `INSTANT ACCESS: https://masowe.divine/courses/abundance-manifestation

Welcome to Abundance Manifestation Masterclass!

Your Course Includes:
- 12 Video Lessons (6+ hours)
- Manifestation Workbook (PDF)
- Daily Abundance Affirmations (MP3)
- Prosperity Meditation Series
- Private Community Access

Login: https://masowe.divine/login
Downloads: https://masowe.divine/downloads/abundance-pack.zip

Lifetime access. Credentials emailed.`
  },
  {
    name: "Divine Purpose Discovery E-Book",
    description: "A 127-page digital guide to discovering your divine purpose and life mission. Includes self-assessment exercises and actionable frameworks.",
    price: "27.00",
    currency: "USD",
    category: "E-Book",
    stockQuantity: 999,
    isActive: true,
    deliveryContent: `INSTANT DOWNLOAD: https://masowe.divine/ebooks/divine-purpose-discovery.pdf

Divine Purpose Discovery E-Book
- 127 Pages of Transformative Content
- Self-Assessment Exercises
- Life Mission Templates
- Purpose Activation Rituals

Alternative formats:
- EPUB: https://masowe.divine/ebooks/divine-purpose.epub
- MOBI: https://masowe.divine/ebooks/divine-purpose.mobi

Thank you for your purchase!`
  },
  {
    name: "Life Transformation Workbook Bundle",
    description: "A collection of 5 interactive workbooks for goal setting, habit tracking, daily reflection, and personal transformation.",
    price: "47.00",
    currency: "USD",
    category: "Workbook",
    stockQuantity: 999,
    isActive: true,
    deliveryContent: `INSTANT DOWNLOAD: https://masowe.divine/workbooks/life-transformation-bundle.zip

Life Transformation Workbook Bundle:
- Goal Setting Mastery Workbook (PDF)
- 90-Day Transformation Planner (PDF)
- Habit Tracker Printables (PDF)
- Vision Mapping Templates (PDF)
- Daily Reflection Journal (PDF)

All files printable, fillable PDFs. 
Total: 5 workbooks, 300+ pages`
  },
  {
    name: "Prosperity Meditation Collection",
    description: "A powerful collection of guided meditations for wealth consciousness, abundance activation, and financial breakthrough.",
    price: "37.00",
    currency: "USD",
    category: "Audio Program",
    stockQuantity: 999,
    isActive: true,
    deliveryContent: `INSTANT DOWNLOAD: https://masowe.divine/audio/prosperity-meditations.zip

Prosperity Meditation Collection:
- Morning Abundance Activation (20 min)
- Wealth Consciousness Deepening (45 min)  
- Money Block Release (30 min)
- Gratitude Amplification (15 min)
- Prosperity Sleep Programming (8 hours)

Stream: https://masowe.divine/stream/prosperity
Download: 890MB ZIP file`
  },
  {
    name: "Mind Mastery Audio Program",
    description: "30-day audio program for subconscious reprogramming, focus enhancement, and mental mastery. Includes binaural beats and guided sessions.",
    price: "67.00",
    currency: "USD",
    category: "Audio Program",
    stockQuantity: 999,
    isActive: true,
    deliveryContent: `INSTANT DOWNLOAD: https://masowe.divine/audio/mind-mastery-program.zip

Mind Mastery Audio Program Contents:
- 30 Daily Mind Training Sessions (30-60 min each)
- Sleep Programming Audios (8 hours)
- Subconscious Reprogramming Series
- Focus Enhancement Binaural Beats

Stream: https://masowe.divine/stream/mind-mastery
Download: 1.2GB ZIP file

Transform your mind, transform your life!`
  },
  {
    name: "Sacred Wealth Planner 2025",
    description: "A comprehensive digital planner for financial tracking, wealth building, and prosperity manifestation throughout 2025.",
    price: "29.00",
    currency: "USD",
    category: "Digital Planner",
    stockQuantity: 999,
    isActive: true,
    deliveryContent: `INSTANT DOWNLOAD: https://masowe.divine/planners/sacred-wealth-2025.zip

Sacred Wealth Planner 2025:
- Full Year Digital Planner (PDF)
- Monthly Wealth Review Templates
- Weekly Financial Tracking
- Daily Gratitude & Goals Pages
- Bonus: Vision Board Template

Compatible with GoodNotes, Notability, PDF readers
Print-ready version included`
  },
  {
    name: "Daily Affirmation Card Deck",
    description: "365 high-resolution digital affirmation cards for daily inspiration, phone wallpapers, and social sharing.",
    price: "19.00",
    currency: "USD",
    category: "Digital Cards",
    stockQuantity: 999,
    isActive: true,
    deliveryContent: `INSTANT DOWNLOAD: https://masowe.divine/cards/daily-affirmations.zip

Daily Affirmation Card Deck:
- 365 High-Resolution Affirmation Cards (PNG)
- Phone Wallpaper Versions (1080x1920)
- Desktop Wallpapers (1920x1080)
- Printable Card Sheets (A4 PDF)

Share on social media, print for your altar,
or use as daily phone backgrounds!`
  },
  {
    name: "Spiritual Business Blueprint",
    description: "Complete 8-module business course for building a purpose-driven spiritual business. Includes templates, marketing strategies, and community access.",
    price: "127.00",
    currency: "USD",
    category: "Business Course",
    stockQuantity: 999,
    isActive: true,
    deliveryContent: `INSTANT ACCESS: https://masowe.divine/courses/spiritual-business-blueprint

Spiritual Business Blueprint:
- 8-Module Video Course
- Business Plan Templates
- Marketing Strategy Workbook
- Client Attraction Meditations
- Legal Templates & Contracts
- Private Mastermind Community

Login: https://masowe.divine/login
Downloads: https://masowe.divine/downloads/sbb-resources.zip

Build your purpose-driven empire!`
  },
  {
    name: "Vision Board Creation Kit",
    description: "Complete digital toolkit with 500+ curated images, quotes, Canva templates, and video tutorial for creating powerful vision boards.",
    price: "24.00",
    currency: "USD",
    category: "Template Kit",
    stockQuantity: 999,
    isActive: true,
    deliveryContent: `INSTANT ACCESS: https://masowe.divine/templates/vision-board-kit

Vision Board Creation Kit:
- 500+ Curated Images (High-Res)
- 200+ Inspiring Quotes
- 50 Canva Templates
- Step-by-Step Video Tutorial (45 min)
- Manifestation Activation Guide

Canva Access: https://canva.com/masowe-visionkit
Direct Download: https://masowe.divine/downloads/vbk.zip (2.3GB)`
  },
  {
    name: "Executive Transformation Session",
    description: "One-on-one 90-minute breakthrough coaching session with personalized guidance, pre-session assessment, recorded session, and 30-day action plan.",
    price: "297.00",
    currency: "USD",
    category: "Coaching",
    stockQuantity: 50,
    isActive: true,
    deliveryContent: `BOOKING CONFIRMED: Your Executive Transformation Session

What happens next:
1. Pre-Session Assessment sent to your email (complete within 48 hours)
2. Schedule your 90-minute session: https://calendly.com/masowe-coaching
3. Receive session preparation guide
4. Live session via Zoom (recorded for your review)
5. 30-Day Action Plan delivered within 24 hours post-session

Questions? coaching@masowefaith.com

Your transformation begins now!`
  },
  {
    name: "Divine Energy Activation Course",
    description: "A comprehensive 7-module course teaching you to harness divine energy for manifestation, healing, and spiritual awakening. Includes guided meditations and workbooks.",
    price: "147.00",
    currency: "USD",
    category: "Online Course",
    stockQuantity: 999,
    isActive: true,
    deliveryContent: `INSTANT ACCESS: https://masowe.divine/courses/divine-energy-activation

Welcome to Divine Energy Activation Course!

Your 7 Modules:
1. Awakening Your Divine Spark
2. Energy Alignment Fundamentals  
3. Manifestation Through Light
4. Healing Frequencies Mastery
5. Chakra Activation Protocols
6. Advanced Manifestation Rituals
7. Living in Divine Flow

Download Workbooks: https://masowe.divine/downloads/dea-workbooks.zip
Meditation Audio: https://masowe.divine/downloads/dea-meditations.zip

Lifetime access granted. Login credentials sent to your email.`
  },
  {
    name: "DLC Virtual Visa/Mastercard",
    description: "Get your DLC-funded virtual card! Spend your Divine Light Credits anywhere Visa/Mastercard is accepted worldwide. 100 DLC = $1 USD conversion rate.",
    price: "0.00",
    currency: "USD",
    category: "Virtual Card",
    stockQuantity: 0,
    isActive: true,
    deliveryContent: `DLC VIRTUAL CARD APPLICATION RECEIVED

Your DLC-funded Visa/Mastercard is being processed!

Next Steps:
1. Identity verification email sent (complete within 24 hours)
2. Card activated within 24-48 hours
3. Virtual card details sent to your email
4. Physical card option available (additional $15)

Card Features:
- 100 DLC = $1 USD conversion
- Daily limit: $1,000
- Monthly limit: $5,000
- Works anywhere Visa/Mastercard accepted

Support: cards@masowefaith.com`
  }
];

export async function seedProducts() {
  try {
    const existingProducts = await db.select().from(products).limit(1);
    
    if (existingProducts.length > 0) {
      console.log("[SEED] Products already exist, skipping seed");
      return;
    }
    
    console.log("[SEED] No products found, seeding 12 products...");
    
    for (const product of SEED_PRODUCTS) {
      await db.insert(products).values(product as any);
    }
    
    console.log("[SEED] Successfully seeded 12 products");
  } catch (error) {
    console.error("[SEED] Error seeding products:", error);
  }
}
