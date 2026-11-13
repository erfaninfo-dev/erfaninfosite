/**
 * The illustration on a Speaking Part 1 topic card.
 *
 * Copied from the app: a title slug picks an image, then a keyword, then a
 * stable fallback from the same pool. These are pictures, not catalog data.
 */

const POOL = [
  "age_pic.webp",
  "city_pic.webp",
  "communication_pic.webp",
  "education_pic.webp",
  "entertainment_pic.webp",
  "environment_pic.webp",
  "experience_pic.webp",
  "food_pic.webp",
  "friendship_pic.webp",
  "futureplans_pic.webp",
  "health_pic.webp",
  "home_pic.webp",
  "love_pic.webp",
  "money_pic.webp",
  "nature_pic.webp",
  "negativefeeling_pic.webp",
  "shopping_pic.webp",
  "problems_pic.webp",
  "achievement_pic.webp",
  "positivefeeling_pic.webp",
  "technology_pic.webp",
  "time_pic.webp",
  "transport_pic.webp",
  "travel_pic.webp",
  "weather_pic.webp",
  "work_pic.webp"
] as const;

const BY_SLUG: Record<string, string> = {
  "internet": "technology_pic.webp",
  "praiseencouragement": "achievement_pic.webp",
  "holidays": "travel_pic.webp",
  "holiday": "travel_pic.webp",
  "library": "education_pic.webp",
  "libraries": "education_pic.webp",
  "smallbusiness": "work_pic.webp",
  "chocolates": "food_pic.webp",
  "chocolate": "food_pic.webp",
  "singing": "entertainment_pic.webp",
  "outerspaceandstars": "technology_pic.webp",
  "list": "education_pic.webp",
  "houseworkandcooking": "home_pic.webp",
  "textmessages": "communication_pic.webp",
  "beingbusy": "time_pic.webp",
  "puzzles": "problems_pic.webp",
  "sayingthankyou": "communication_pic.webp",
  "publictransportation": "transport_pic.webp",
  "names": "people_pic.webp",
  "jewelry": "shopping_pic.webp",
  "geography": "city_pic.webp",
  "flowers": "nature_pic.webp",
  "birthday": "positivefeeling_pic.webp",
  "planschedule": "futureplans_pic.webp",
  "sparetime": "entertainment_pic.webp",
  "spendingtimebyyourself": "home_pic.webp",
  "writing": "education_pic.webp",
  "weather": "weather_pic.webp",
  "snacks": "food_pic.webp",
  "patience": "opinion_pic.webp",
  "machine": "technology_pic.webp",
  "memory": "experience_pic.webp",
  "hatscaps": "shopping_pic.webp",
  "borrowinglending": "friendship_pic.webp",
  "colors": "entertainment_pic.webp",
  "hobby": "entertainment_pic.webp",
  "advertisement": "communication_pic.webp",
  "feelingbored": "negativefeeling_pic.webp",
  "friends": "friendship_pic.webp",
  "booksandreadinghabits": "education_pic.webp",
  "eveningtime": "time_pic.webp",
  "sittingdown": "home_pic.webp",
  "computers": "technology_pic.webp",
  "oldbuildings": "city_pic.webp",
  "collectingthings": "shopping_pic.webp",
  "artdrawing": "entertainment_pic.webp",
  "talents": "achievement_pic.webp",
  "watch": "time_pic.webp",
  "takingphotos": "technology_pic.webp",
  "cars": "transport_pic.webp",
  "lostandfound": "problems_pic.webp",
  "websites": "technology_pic.webp",
  "streetmarket": "shopping_pic.webp",
  "mobilephone": "technology_pic.webp",
  "timemanagement": "time_pic.webp",
  "sportsprograms": "health_pic.webp",
  "makingfriends": "friendship_pic.webp",
  "goodview": "nature_pic.webp",
  "laughing": "positivefeeling_pic.webp",
  "teamwork": "achievement_pic.webp",
  "fishing": "nature_pic.webp",
  "perfume": "shopping_pic.webp",
  "roadsandstreets": "transport_pic.webp",
  "coins": "money_pic.webp",
  "teachers": "education_pic.webp",
  "bikes": "transport_pic.webp",
  "transport": "transport_pic.webp",
  "challenges": "achievement_pic.webp",
  "askingforhelp": "friendship_pic.webp",
  "childhoodmemory": "experience_pic.webp",
  "plants": "nature_pic.webp",
  "excitingactivities": "entertainment_pic.webp",
  "stayingathome": "home_pic.webp",
  "sharing": "friendship_pic.webp",
  "morningroutine": "time_pic.webp",
  "art": "entertainment_pic.webp",
  "keys": "home_pic.webp",
  "numbers": "education_pic.webp",
  "science": "education_pic.webp",
  "news": "communication_pic.webp",
  "ebooksandpaperbooks": "education_pic.webp",
  "stayingup": "time_pic.webp",
  "language": "communication_pic.webp",
  "happythings": "positivefeeling_pic.webp",
  "penorpencil": "education_pic.webp",
  "stagesoflife": "age_pic.webp",
  "tshirts": "shopping_pic.webp",
  "weekends": "entertainment_pic.webp",
  "breakfast": "food_pic.webp",
  "videogames": "technology_pic.webp",
  "sunglasses": "shopping_pic.webp",
  "socialmedia": "technology_pic.webp",
  "cake": "food_pic.webp",
  "losingthings": "problems_pic.webp",
  "music": "entertainment_pic.webp",
  "crowdedplace": "city_pic.webp",
  "celebrity": "people_pic.webp",
  "running": "health_pic.webp",
  "chatting": "communication_pic.webp",
  "helpingothers": "friendship_pic.webp",
  "maps": "travel_pic.webp",
  "clothing": "shopping_pic.webp",
  "musicalinstruments": "entertainment_pic.webp",
  "noise": "problems_pic.webp",
  "teaandcoffee": "food_pic.webp",
  "robots": "technology_pic.webp",
  "gifts": "love_pic.webp",
  "films": "entertainment_pic.webp",
  "icecream": "food_pic.webp",
  "concentrate": "opinion_pic.webp",
  "fixingthings": "problems_pic.webp",
  "health": "health_pic.webp",
  "dream": "experience_pic.webp",
  "favouriteday": "positivefeeling_pic.webp",
  "rain": "weather_pic.webp",
  "dayoff": "entertainment_pic.webp",
  "bags": "shopping_pic.webp",
  "wildanimals": "nature_pic.webp",
  "school": "education_pic.webp",
  "highschool": "education_pic.webp",
  "technology": "technology_pic.webp",
  "emails": "communication_pic.webp",
  "rainydays": "weather_pic.webp",
  "work": "work_pic.webp",
  "workcareer": "work_pic.webp",
  "job": "work_pic.webp",
  "business": "work_pic.webp",
  "hometown": "city_pic.webp",
  "hometowncity": "city_pic.webp",
  "city": "city_pic.webp",
  "cities": "city_pic.webp",
  "home": "home_pic.webp",
  "family": "home_pic.webp",
  "food": "food_pic.webp",
  "sport": "health_pic.webp",
  "sports": "health_pic.webp",
  "travel": "travel_pic.webp",
  "shopping": "shopping_pic.webp",
  "online": "technology_pic.webp",
  "friendship": "friendship_pic.webp",
  "money": "money_pic.webp",
  "education": "education_pic.webp",
  "study": "education_pic.webp",
  "studying": "education_pic.webp",
  "nature": "nature_pic.webp",
  "environment": "environment_pic.webp",
  "communication": "communication_pic.webp",
  "people": "people_pic.webp",
  "personality": "people_pic.webp",
  "time": "time_pic.webp",
  "age": "age_pic.webp",
  "future": "futureplans_pic.webp",
  "futureplans": "futureplans_pic.webp",
  "experience": "experience_pic.webp",
  "memories": "experience_pic.webp",
  "opinion": "opinion_pic.webp",
  "opinions": "opinion_pic.webp",
  "love": "love_pic.webp",
  "relationships": "love_pic.webp",
  "feelings": "positivefeeling_pic.webp",
  "positivefeelings": "positivefeeling_pic.webp",
  "negativefeelings": "negativefeeling_pic.webp",
  "stress": "problems_pic.webp",
  "problems": "problems_pic.webp",
  "achievement": "achievement_pic.webp",
  "success": "achievement_pic.webp",
  "entertainment": "entertainment_pic.webp",
  "freetime": "entertainment_pic.webp"
};

const KEYWORDS: Array<readonly [string, string]> = [
  [
    "childhood",
    "experience_pic.webp"
  ],
  [
    "transportation",
    "transport_pic.webp"
  ],
  [
    "socialmedia",
    "technology_pic.webp"
  ],
  [
    "videogame",
    "technology_pic.webp"
  ],
  [
    "ebook",
    "education_pic.webp"
  ],
  [
    "paperbook",
    "education_pic.webp"
  ],
  [
    "reading",
    "education_pic.webp"
  ],
  [
    "housework",
    "home_pic.webp"
  ],
  [
    "cooking",
    "food_pic.webp"
  ],
  [
    "outerspace",
    "technology_pic.webp"
  ],
  [
    "space",
    "technology_pic.webp"
  ],
  [
    "celebrity",
    "people_pic.webp"
  ],
  [
    "musical",
    "entertainment_pic.webp"
  ],
  [
    "instrument",
    "entertainment_pic.webp"
  ],
  [
    "photograph",
    "technology_pic.webp"
  ],
  [
    "mobile",
    "technology_pic.webp"
  ],
  [
    "computer",
    "technology_pic.webp"
  ],
  [
    "website",
    "technology_pic.webp"
  ],
  [
    "robot",
    "technology_pic.webp"
  ],
  [
    "email",
    "communication_pic.webp"
  ],
  [
    "message",
    "communication_pic.webp"
  ],
  [
    "chat",
    "communication_pic.webp"
  ],
  [
    "thank",
    "communication_pic.webp"
  ],
  [
    "advert",
    "communication_pic.webp"
  ],
  [
    "language",
    "communication_pic.webp"
  ],
  [
    "news",
    "communication_pic.webp"
  ],
  [
    "chocolate",
    "food_pic.webp"
  ],
  [
    "snack",
    "food_pic.webp"
  ],
  [
    "breakfast",
    "food_pic.webp"
  ],
  [
    "coffee",
    "food_pic.webp"
  ],
  [
    "icecream",
    "food_pic.webp"
  ],
  [
    "cake",
    "food_pic.webp"
  ],
  [
    "fishing",
    "nature_pic.webp"
  ],
  [
    "flower",
    "nature_pic.webp"
  ],
  [
    "plant",
    "nature_pic.webp"
  ],
  [
    "animal",
    "nature_pic.webp"
  ],
  [
    "rain",
    "weather_pic.webp"
  ],
  [
    "library",
    "education_pic.webp"
  ],
  [
    "school",
    "education_pic.webp"
  ],
  [
    "teacher",
    "education_pic.webp"
  ],
  [
    "science",
    "education_pic.webp"
  ],
  [
    "writing",
    "education_pic.webp"
  ],
  [
    "holiday",
    "travel_pic.webp"
  ],
  [
    "praise",
    "achievement_pic.webp"
  ],
  [
    "encourag",
    "achievement_pic.webp"
  ],
  [
    "talent",
    "achievement_pic.webp"
  ],
  [
    "teamwork",
    "achievement_pic.webp"
  ],
  [
    "challenge",
    "achievement_pic.webp"
  ],
  [
    "business",
    "work_pic.webp"
  ],
  [
    "market",
    "shopping_pic.webp"
  ],
  [
    "cloth",
    "shopping_pic.webp"
  ],
  [
    "jewel",
    "shopping_pic.webp"
  ],
  [
    "perfume",
    "shopping_pic.webp"
  ],
  [
    "sunglass",
    "shopping_pic.webp"
  ],
  [
    "collect",
    "shopping_pic.webp"
  ],
  [
    "shirt",
    "shopping_pic.webp"
  ],
  [
    "bag",
    "shopping_pic.webp"
  ],
  [
    "coin",
    "money_pic.webp"
  ],
  [
    "bored",
    "negativefeeling_pic.webp"
  ],
  [
    "happy",
    "positivefeeling_pic.webp"
  ],
  [
    "laugh",
    "positivefeeling_pic.webp"
  ],
  [
    "dream",
    "experience_pic.webp"
  ],
  [
    "memory",
    "experience_pic.webp"
  ],
  [
    "borrow",
    "friendship_pic.webp"
  ],
  [
    "lend",
    "friendship_pic.webp"
  ],
  [
    "help",
    "friendship_pic.webp"
  ],
  [
    "share",
    "friendship_pic.webp"
  ],
  [
    "friend",
    "friendship_pic.webp"
  ],
  [
    "gift",
    "love_pic.webp"
  ],
  [
    "hometown",
    "city_pic.webp"
  ],
  [
    "geograph",
    "city_pic.webp"
  ],
  [
    "crowded",
    "city_pic.webp"
  ],
  [
    "building",
    "city_pic.webp"
  ],
  [
    "street",
    "transport_pic.webp"
  ],
  [
    "road",
    "transport_pic.webp"
  ],
  [
    "bike",
    "transport_pic.webp"
  ],
  [
    "car",
    "transport_pic.webp"
  ],
  [
    "weather",
    "weather_pic.webp"
  ],
  [
    "transport",
    "transport_pic.webp"
  ],
  [
    "running",
    "health_pic.webp"
  ],
  [
    "sport",
    "health_pic.webp"
  ],
  [
    "health",
    "health_pic.webp"
  ],
  [
    "routine",
    "time_pic.webp"
  ],
  [
    "schedule",
    "futureplans_pic.webp"
  ],
  [
    "weekend",
    "entertainment_pic.webp"
  ],
  [
    "evening",
    "time_pic.webp"
  ],
  [
    "morning",
    "time_pic.webp"
  ],
  [
    "busy",
    "time_pic.webp"
  ],
  [
    "family",
    "home_pic.webp"
  ],
  [
    "home",
    "home_pic.webp"
  ],
  [
    "singing",
    "entertainment_pic.webp"
  ],
  [
    "music",
    "entertainment_pic.webp"
  ],
  [
    "film",
    "entertainment_pic.webp"
  ],
  [
    "hobby",
    "entertainment_pic.webp"
  ],
  [
    "art",
    "entertainment_pic.webp"
  ],
  [
    "puzzle",
    "problems_pic.webp"
  ],
  [
    "noise",
    "problems_pic.webp"
  ],
  [
    "lost",
    "problems_pic.webp"
  ],
  [
    "fix",
    "problems_pic.webp"
  ],
  [
    "concentr",
    "opinion_pic.webp"
  ],
  [
    "patience",
    "opinion_pic.webp"
  ],
  [
    "stage",
    "age_pic.webp"
  ],
  [
    "food",
    "food_pic.webp"
  ],
  [
    "study",
    "education_pic.webp"
  ],
  [
    "work",
    "work_pic.webp"
  ],
  [
    "travel",
    "travel_pic.webp"
  ],
  [
    "map",
    "travel_pic.webp"
  ],
  [
    "shop",
    "shopping_pic.webp"
  ],
  [
    "money",
    "money_pic.webp"
  ],
  [
    "tech",
    "technology_pic.webp"
  ],
  [
    "internet",
    "technology_pic.webp"
  ],
  [
    "online",
    "technology_pic.webp"
  ],
  [
    "nature",
    "nature_pic.webp"
  ],
  [
    "city",
    "city_pic.webp"
  ],
  [
    "name",
    "people_pic.webp"
  ],
  [
    "people",
    "people_pic.webp"
  ]
];

function slugOf(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/** Public path for the picture the app shows on this topic. */
export function speakingTopicArt(topicId: number, title: string): string {
  const slug = slugOf(title);
  const named = slug ? BY_SLUG[slug] : undefined;
  const keyword = named ? undefined : KEYWORDS.find(([word]) => slug.includes(word))?.[1];
  const index = topicId <= 0 ? 0 : (topicId * 7 + 1) % POOL.length;
  const file = named ?? keyword ?? POOL[index] ?? 'education_pic.webp';
  return `/brand/speaking/${file}`;
}
