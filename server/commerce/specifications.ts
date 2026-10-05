import {readFile} from "node:fs/promises";
import {resolve} from "node:path";
import {checksum,validateContent} from "./packaging";
import {ControlError} from "../safety/primitives";

export const files:Record<string,string>={
  "abundance-journal":"abundance-journal.md","affirmation-cards":"affirmation-cards.md",
  "wealth-consciousness":"wealth-consciousness-ebook.md","morning-ritual-guide":"morning-ritual-guide.md",
  "goal-planner":"goal-planner.md","gratitude-bundle":"gratitude-bundle.md",
  "chakra-healing":"chakra-healing-journal.md","vision-board-kit":"vision-board-kit.md",
  "law-of-attraction":"law-of-attraction-workbook.md","meditation-scripts":"meditation-scripts.md",
  "spiritual-business":"spiritual-business-starter.md","anxiety-relief":"anxiety-relief-toolkit.md","money-mindset":"money-mindset-journal.md"};
const names:Record<string,string>={
  "365 Daily Affirmation Cards":"affirmation-cards","Wealth Consciousness E-Book":"wealth-consciousness",
  "Chakra Healing Journal":"chakra-healing","Gratitude Practice Bundle":"gratitude-bundle",
  "Guided Meditation Scripts":"meditation-scripts","Law of Attraction Mastery Workbook":"law-of-attraction",
  "Sacred 90-Day Goal Planner":"goal-planner","Spiritual Business Starter Kit":"spiritual-business",
  "Vision Board Creation Kit":"vision-board-kit"};
export type Specification={title:string;slug:string|null;adapter:"prepared_file"|"personalized_ai"|"unavailable";
  fields:string[];units:number;sourceHash:string;revision:number;content?:string;reason?:string};
export async function specification(product:any):Promise<{spec:Specification;hash:string}> {
  let slug=product.delivery_slug||product.delivery_content?.match(/\/api\/products\/download\/([a-z0-9-]+)/)?.[1]||names[product.name];
  if(!files[slug])slug=null;
  const spec:Specification={title:product.name,slug,adapter:slug?"prepared_file":"unavailable",
    fields:[],units:slug==="affirmation-cards"?365:slug==="goal-planner"?90:
      ["abundance-journal","law-of-attraction","spiritual-business"].includes(slug)?30:0,sourceHash:"",revision:1};
  if(product.inventory_mode==="physical") {
    spec.adapter="unavailable";spec.reason="AUTOMATIC_PHYSICAL_ADAPTER_NOT_IMPLEMENTED";slug=null;spec.slug=null;
  }
  else if(product.inventory_mode==="service" && !slug) spec.reason="AUTOMATIC_ADAPTER_NOT_IMPLEMENTED";
  else if(product.name==="Akashic Record Reading") {
    spec.adapter="personalized_ai";spec.fields=["name","intention"];spec.sourceHash=checksum("structured-reading-required-limits-independent-qa-v4");
  }else if(!slug)spec.reason="ADVERTISED_PRODUCT_HAS_NO_VERIFIED_ADAPTER";
  if(slug) {
    const original=await readFile(resolve("server/products",files[slug]),"utf8");
    spec.sourceHash=checksum(original);
    let content=original;
    if(spec.units) {
      const practices=["Name one small action you can complete today.","Write down a boundary that protects your time.",
        "Record a resource you already have.","Review yesterday's progress without judging yourself.",
        "Choose one task that supports your next goal.","List one person or resource you can learn from."];
      const themes=["Clarity","Patience","Gratitude","Confidence","Consistency","Learning","Rest","Planning","Courage","Kindness","Focus","Reflection"];
      const affirmations=["I can approach today's choices with","I can practise","I can make space for","I can strengthen",
        "I can welcome","I can return to","I can learn to apply","I can value","I can choose","I can express",
        "I can build habits around","I can seek support for","I can take one practical step towards",
        "I can stay open to","I can notice opportunities for","I can act with","I can reflect on"];
      const qualities=["patience without expecting a guaranteed outcome","kindness while keeping healthy boundaries",
        "clarity about what is within my control","gratitude for the support I already have","steady effort rather than perfection",
        "courage to ask thoughtful questions","honest reflection about what I can change","rest that supports sustainable effort",
        "curiosity about useful new skills","focus on one realistic priority","respect for my needs and those of others",
        "calm attention to the next small action","self-compassion when progress is slow","flexibility when a plan needs adjustment",
        "confidence grounded in preparation","generosity that respects my resources","discernment about advice and information",
        "consistency in an achievable daily practice","care for my time and attention","openness to supportive conversations",
        "appreciation for ordinary moments","purpose guided by values rather than promises"];
      content=original+`\n\n# Complete ${spec.units}-day printable practice\nUse one numbered page each day. Reflection does not guarantee income, healing or external events.\n\n`;
      for(let day=1;day<=spec.units;day++) {
        const theme=themes[(day-1)%themes.length],practice=practices[Math.floor((day-1)/themes.length)%practices.length];
        content+=`## Day ${day} — ${theme}\n\n${slug==="affirmation-cards"?`Affirmation: ${affirmations[Math.floor((day-1)/qualities.length)]} ${qualities[(day-1)%qualities.length]}.`:
          `Today's intention: __________________________\nPriority goal: __________________________\nOne achievable action: __________________________\nResources or support: __________________________\nHabit check: __________________________\nGratitude: __________________________`}\n\nPractice: ${practice}\nReflection: What does ${theme.toLowerCase()} mean in my current circumstances on day ${day}?\nNotes: __________________________\n\n`;
      }
      if(slug==="goal-planner") {
        for(let week=1;week<=13;week++)content+=`## Weekly review ${week}\nProgress: __________\nNext week's priorities: __________\nSupport needed: __________\n\n`;
        for(let month=1;month<=3;month++)content+=`## Monthly review ${month}\nVision check: __________\nCompleted goals: __________\nAdjustments: __________\n\n`;
      }
    }
    if(slug==="gratitude-bundle") {
      content+="\n# Complete gratitude companion\n";
      for(let week=1;week<=8;week++)content+=`\n## Journal week ${week}\nWho supported you this week? __________\nWhat did you learn? __________\nWhat ordinary moment did you appreciate? __________\nNext week's gratitude intention: __________\n`;
      for(let card=1;card<=52;card++)content+=`\n## Gratitude card ${card}\nNotice ${["a person","a place","an opportunity","a lesson","a small pleasure","a useful resource"][card%6]} you appreciated this week. Name a concrete example and how it affected your day.\n`;
      for(let day=1;day<=90;day++)content+=`\nTracker day ${day}: Practised [ ]  One thing appreciated: __________\n`;
    }
    if(slug==="vision-board-kit") {
      content+="\n# 210 original reflection quotations\n";
      const beginnings=["A thoughtful goal","A small practical step","A clear intention","A patient mind","A useful habit","A moment of reflection","A kind boundary",
        "A realistic plan","A grateful perspective","An honest review","A focused morning","A supportive conversation","A fresh attempt","A calmer response","A written priority"];
      const endings=["can make the next action easier.","helps you notice what matters.","creates room for learning.","is worth reviewing without judgement.",
        "can support steady effort.","does not need to be perfect.","belongs in your daily practice.","can change how you use your time.",
        "starts with what you can influence.","deserves patience.","can be shared with someone you trust.","is stronger when it is specific.",
        "leaves space for rest.","is a useful starting point."];
      let number=0;
      for(const beginning of beginnings)for(const ending of endings)content+=`\n${++number}. ${beginning} ${ending}`;
    }
    if(slug==="meditation-scripts") {
      const count=Array.from(original.matchAll(/^## MEDITATION \d+/gm)).length;
      const themes=["Grounding in the present","Compassion for yourself","Resting attention","Patient goal-setting","Gratitude for ordinary moments"];
      for(let number=count+1;number<=10;number++) {
        const theme=themes[(number-count-1)%themes.length];
        content+=`\n\n## MEDITATION ${number}: ${theme} (5 minutes)\n
Find a comfortable seated or lying position. Keep your eyes open if that feels safer. You can stop at any point.
Notice the support of the chair, bed or floor. Let your shoulders soften without forcing them.
Allow your breathing to remain natural. There is no need to hold your breath or change its pace.
Pause for thirty seconds, noticing the sensations you can observe right now.

Bring the theme of ${theme.toLowerCase()} to mind. You do not need to produce a special feeling.
Ask yourself what this theme might mean in one ordinary moment of your day.
If a thought or distraction arrives, acknowledge it and return to the feeling of support beneath you.
Pause for one minute. Let thoughts pass without treating them as commands or predictions.

Think of a small, practical action you can choose today. Keep it within your control.
You might take a short break, write a priority, ask for support, or notice something you appreciate.
Imagine only the action itself, without assuming that a particular outcome is guaranteed.
Pause for one minute and allow the idea to settle.

Return to the sounds around you. Notice the room, your hands and your feet.
If comfortable, make a small movement. Give yourself time to return to your next activity.
Spend the final minute reflecting on what you noticed. Write a sentence or record a short note if useful.
This practice is for reflection and relaxation; it is not medical treatment or a promise of financial or external results.\n`;
      }
    }
    if(slug==="chakra-healing") {
      const themes=["Safety and grounding","Creativity and enjoyment","Confidence and purpose","Kindness and connection",
        "Honest communication","Perspective and learning","Values and meaning"];
      content+="\n\n# Complete seven-week reflective workbook\nThese chakra themes are a spiritual framework for reflection, not a diagnosis or medical treatment.\n";
      for(let week=1;week<=7;week++) {
        content+=`\n## Guided week ${week} — ${themes[week-1]}\n
Assess your experience without diagnosing it: How supported do you feel? What did you notice this week?
What is within your control? Who can you ask for support? What would a kinder expectation look like?
Write a starting intention: __________\n`;
        for(let day=1;day<=7;day++)content+=`\n### Week ${week}, daily worksheet ${day}\n
Reflection theme: ${themes[week-1]}\nOne moment you noticed: __________\nA feeling you can name: __________
One practical action within your control: __________\nA boundary or support you need: __________
Affirmation: I can reflect on my experience without demanding perfection or a guaranteed outcome.
Evening reflection: What helped today? __________\nWhat would you adjust tomorrow? __________\n`;
        content+="\nWeekly review: __________\nWhat did you learn? __________\nNext week's intention: __________\n";
      }
    }
    if(slug==="meditation-scripts"&&Array.from(content.matchAll(/^## MEDITATION \d+/gm)).length!==10)
      throw new ControlError("REQUIRED_SCRIPTS_QA_FAILED",503);
    if(slug==="chakra-healing"&&Array.from(content.matchAll(/^## Guided week \d+/gm)).length!==7)
      throw new ControlError("REQUIRED_WEEKS_QA_FAILED",503);
    if(slug==="wealth-consciousness"&&Array.from(content.matchAll(/^# CHAPTER \d+/gm)).length!==7)
      throw new ControlError("REQUIRED_CHAPTERS_QA_FAILED",503);
    content+="\n\n## Use and limitations\nThis is reflective/educational material, not a guarantee of financial returns, supernatural protection or medical healing. Seek qualified advice for financial, health or legal decisions.\n";
    // Imported material is packaged as existing content, not falsely attributed
    // to an AI model. Named unit-count products are deterministically completed.
    validateContent(content,spec.units);spec.content=content;
  }
  return{spec,hash:checksum(JSON.stringify(spec))};
}
export function customerInputs(spec:Specification,value:unknown):Record<string,string> {
  if(!spec.fields.length)return{};
  if(!value||typeof value!=="object"||Array.isArray(value))throw new ControlError("PERSONALIZATION_REQUIRED");
  const result:Record<string,string>={};
  for(const field of spec.fields) {
    const text=(value as Record<string,unknown>)[field];
    if(typeof text!=="string"||text.trim().length<2||text.length>(field==="name"?80:500)||/[\x00-\x1f]/.test(text))
      throw new ControlError("INVALID_PERSONALIZATION");
    result[field]=text.trim();
  }
  return result;
}
