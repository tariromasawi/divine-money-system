import { db } from "./db";
import { products } from "@shared/schema";
import { readFileSync } from "fs";
import { join } from "path";

function loadProductContent(filename: string): string {
  try {
    return readFileSync(join(__dirname, "products", filename), "utf-8");
  } catch {
    return "Content file not found. Please contact support.";
  }
}

const SEED_PRODUCTS = [
  {
    name: "Abundance Manifestation Journal",
    description: "30-day guided journal to rewire your subconscious for wealth. Includes daily prompts, gratitude exercises, abundance affirmations, and evening reflections. Printable PDF - use digitally or print at home.",
    price: "12.00",
    currency: "USD",
    category: "Digital Journal",
    stockQuantity: 999,
    isActive: true,
    deliveryContent: `INSTANT DOWNLOAD

Your Abundance Manifestation Journal is ready!

Download your PDF here:
https://masowe-faith-group.replit.app/api/products/download/abundance-journal

What's included:
- 30 days of guided abundance exercises
- Morning intention setting prompts
- Gratitude practice sections
- 50 powerful abundance affirmations
- Evening reflection pages

PRINTING TIPS:
- Use A4 or Letter size paper
- Print single-sided for writing comfort
- Consider a 3-ring binder for flexibility

Begin your abundance journey today!

Questions? Reply to this email for support.`
  },
  {
    name: "365 Daily Affirmation Cards",
    description: "One powerful affirmation for every day of the year. Printable card deck covering wealth, love, health, success, and personal growth. Perfect for morning rituals, phone wallpapers, or social sharing.",
    price: "9.00",
    currency: "USD",
    category: "Printable Cards",
    stockQuantity: 999,
    isActive: true,
    deliveryContent: `INSTANT DOWNLOAD

Your 365 Daily Affirmation Cards are ready!

Download your PDF deck:
https://masowe-faith-group.replit.app/api/products/download/affirmation-cards

What's included:
- 365 unique affirmation cards (one for each day)
- Organized by month/theme
- 12 bonus emergency affirmation cards
- Printing instructions

HOW TO USE:
- Draw one card each morning
- Set as phone wallpaper
- Share on social media
- Print and cut for physical deck

Transform your mindset one day at a time!`
  },
  {
    name: "Wealth Consciousness E-Book",
    description: "The complete guide to reprogramming your mind for financial freedom. 7 chapters covering money psychology, block identification, daily rituals, and advanced manifestation techniques. 50+ pages of transformational content.",
    price: "15.00",
    currency: "USD",
    category: "E-Book",
    stockQuantity: 999,
    isActive: true,
    deliveryContent: `INSTANT DOWNLOAD

Your Wealth Consciousness E-Book is ready!

Download your PDF:
https://masowe-faith-group.replit.app/api/products/download/wealth-consciousness-ebook

What's included:
- 7 comprehensive chapters
- Money block identification exercises
- Belief replacement worksheets
- Daily wealth rituals
- 100 wealth affirmations
- Action planning section

Read on any device - tablet, phone, or computer.

Your journey to financial freedom starts now!`
  },
  {
    name: "5AM Miracle Morning Ritual Guide",
    description: "7-day system to transform your mornings from chaotic to calm. Step-by-step rituals for hydration, movement, meditation, intention setting, and productivity. Quick-start guide with daily checklists.",
    price: "7.00",
    currency: "USD",
    category: "Digital Guide",
    stockQuantity: 999,
    isActive: true,
    deliveryContent: `INSTANT DOWNLOAD

Your Morning Ritual Guide is ready!

Download your PDF:
https://masowe-faith-group.replit.app/api/products/download/morning-ritual-guide

What's included:
- 7-day morning transformation system
- Daily ritual checklists
- Meditation instructions
- Evening wind-down routine
- Troubleshooting tips

Start tomorrow morning!

Set your alarm and begin your transformation.`
  },
  {
    name: "Sacred 90-Day Goal Planner",
    description: "Comprehensive goal-setting system with vision exercises, goal breakdown worksheets, weekly planning pages, monthly reviews, habit trackers, and gratitude sections. Printable PDF planner.",
    price: "14.00",
    currency: "USD",
    category: "Digital Planner",
    stockQuantity: 999,
    isActive: true,
    deliveryContent: `INSTANT DOWNLOAD

Your Sacred 90-Day Goal Planner is ready!

Download your PDF:
https://masowe-faith-group.replit.app/api/products/download/goal-planner

What's included:
- Vision creation exercises
- 3 main goal breakdown worksheets
- 12 weekly planning spreads
- 3 monthly review pages
- 90-day habit tracker
- Daily gratitude sections

WORKS WITH:
- GoodNotes, Notability (iPad)
- PDF readers (any device)
- Print at home

Your next 90 days start now!`
  },
  {
    name: "Complete Gratitude Practice Bundle",
    description: "Everything you need for a powerful gratitude practice: 8-week guided journal, 52 affirmation cards, 90-day tracker, and bonus letter templates. Transform your mindset through gratitude.",
    price: "19.00",
    currency: "USD",
    category: "Bundle",
    stockQuantity: 999,
    isActive: true,
    deliveryContent: `INSTANT DOWNLOAD

Your Gratitude Practice Bundle is ready!

Download your ZIP file:
https://masowe-faith-group.replit.app/api/products/download/gratitude-bundle

Bundle includes:
1. 8-Week Gratitude Journal (PDF)
2. 52 Gratitude Affirmation Cards (PDF)
3. 90-Day Gratitude Tracker (PDF)
4. Gratitude Letter Templates (PDF)

SCIENCE-BACKED:
Research shows gratitude practice:
- Increases happiness by 25%
- Improves sleep quality
- Reduces stress and anxiety

Start your gratitude journey today!`
  },
  {
    name: "Chakra Healing Journal",
    description: "7-week energy balancing workbook. One week per chakra with assessments, healing exercises, affirmations, and tracking. Includes quick balancing meditation, food guide, and crystal recommendations.",
    price: "11.00",
    currency: "USD",
    category: "Healing Workbook",
    stockQuantity: 999,
    isActive: true,
    deliveryContent: `INSTANT DOWNLOAD

Your Chakra Healing Journal is ready!

Download your PDF:
https://masowe-faith-group.replit.app/api/products/download/chakra-healing-journal

What's included:
- 7-week guided program (one chakra per week)
- Chakra assessment questionnaires
- Daily healing exercises
- Chakra affirmations
- Quick balancing meditation script
- Chakra food guide
- Crystal recommendations

Balance your energy centers and transform your life!`
  },
  {
    name: "Vision Board Creation Kit",
    description: "Complete digital toolkit for manifesting your dreams. Includes step-by-step guide, 200+ affirmation quotes, layout templates, and activation ritual. Create your vision board this weekend!",
    price: "8.00",
    currency: "USD",
    category: "Template Kit",
    stockQuantity: 999,
    isActive: true,
    deliveryContent: `INSTANT DOWNLOAD

Your Vision Board Kit is ready!

Download your PDF:
https://masowe-faith-group.replit.app/api/products/download/vision-board-kit

Kit includes:
- Step-by-step creation guide
- 200+ affirmation quotes
- 4 layout templates
- Life category prompts
- Vision board activation ritual
- Manifestation journaling prompts

IMAGE SOURCES (free):
- Pinterest
- Unsplash.com
- Canva.com

Create your vision board and manifest your dreams!`
  },
  {
    name: "Law of Attraction Mastery Workbook",
    description: "30-day practical guide to manifest anything. Learn the manifestation formula, identify blocks, build belief, and take aligned action. Includes visualization scripts, affirmation templates, and tracking sheets.",
    price: "17.00",
    currency: "USD",
    category: "Workbook",
    stockQuantity: 999,
    isActive: true,
    deliveryContent: `INSTANT DOWNLOAD

Your Law of Attraction Workbook is ready!

Download your PDF:
https://masowe-faith-group.replit.app/api/products/download/law-of-attraction-workbook

What's included:
- 30-day manifestation program
- Desire clarity exercises
- Belief building worksheets
- Visualization scripts
- Daily practice rituals
- Manifestation tracking sheets
- Troubleshooting guide

The formula: Desire + Belief + Action = Manifestation

Your dream life awaits!`
  },
  {
    name: "Guided Meditation Scripts Collection",
    description: "10 transformational meditation scripts for personal use or recording. Includes deep relaxation, stress release, abundance, self-love, and manifestation meditations. Commercial recording rights included.",
    price: "13.00",
    currency: "USD",
    category: "Meditation Scripts",
    stockQuantity: 999,
    isActive: true,
    deliveryContent: `INSTANT DOWNLOAD

Your Meditation Scripts Collection is ready!

Download your PDF:
https://masowe-faith-group.replit.app/api/products/download/meditation-scripts

10 Scripts included:
1. Deep Relaxation (15 min)
2. Morning Intention Setting (10 min)
3. Stress Release (12 min)
4. Abundance & Prosperity (15 min)
5. Self-Love & Healing (15 min)
6. Sleep & Insomnia Relief (20 min)
7. Confidence Building (12 min)
8. Letting Go (15 min)
9. Inner Peace (10 min)
10. Manifestation Power (15 min)

BONUS: Quick 2-minute calm down script

Commercial recording rights included!`
  },
  {
    name: "Spiritual Business Starter Kit",
    description: "Launch your purpose-driven business in 30 days. Includes business model clarity, branding foundations, pricing strategies, client attraction methods, templates, scripts, and mindset work.",
    price: "27.00",
    currency: "USD",
    category: "Business Course",
    stockQuantity: 999,
    isActive: true,
    deliveryContent: `INSTANT DOWNLOAD

Your Spiritual Business Starter Kit is ready!

Download your PDF:
https://masowe-faith-group.replit.app/api/products/download/spiritual-business-starter

6 Modules included:
1. Clarifying Your Business (gift, client, model)
2. Your Spiritual Brand (values, voice, colors)
3. Pricing Your Services (value-based framework)
4. Attracting Clients (content, platforms, methods)
5. Templates & Scripts (discovery calls, emails)
6. Success Mindset (affirmations, blocks)

BONUS:
- 30-day launch plan checklist
- Legal basics checklist

Turn your spiritual gifts into a thriving business!`
  },
  {
    name: "Anxiety Relief Toolkit",
    description: "Instant calm techniques plus daily practices for managing anxiety. Includes 8 immediate relief methods, cognitive reframing worksheets, daily routines, and 7-day tracking log. Evidence-based approaches.",
    price: "12.00",
    currency: "USD",
    category: "Mental Health",
    stockQuantity: 999,
    isActive: true,
    deliveryContent: `INSTANT DOWNLOAD

Your Anxiety Relief Toolkit is ready!

Download your PDF:
https://masowe-faith-group.replit.app/api/products/download/anxiety-relief-toolkit

What's included:
- 8 instant relief techniques
- Cognitive reframe worksheets
- Daily calming practices
- Morning & evening routines
- 7-day anxiety tracking log
- Printable first aid card

TECHNIQUES INCLUDED:
- Box breathing
- 5-4-3-2-1 grounding
- Physiological sigh (Stanford research)
- Progressive muscle relaxation
- And more...

Find your calm. You've got this.`
  }
];

export async function seedProducts() {
  try {
    const existingProducts = await db.select().from(products).limit(1);
    
    if (existingProducts.length > 0) {
      console.log("[SEED] Products already exist, checking for updates...");
      return;
    }
    
    console.log("[SEED] No products found, seeding 12 real digital products...");
    
    for (const product of SEED_PRODUCTS) {
      await db.insert(products).values(product as any);
    }
    
    console.log("[SEED] Successfully seeded 12 products with instant delivery content");
  } catch (error) {
    console.error("[SEED] Error seeding products:", error);
  }
}
