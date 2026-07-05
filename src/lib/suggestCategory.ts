const DOMAIN_RULES: Record<string, string> = {
  // AI
  "openai.com": "AI",
  "anthropic.com": "AI",
  "huggingface.co": "AI",
  "deepmind.com": "AI",
  "mistral.ai": "AI",
  "replicate.com": "AI",
  "together.ai": "AI",
  "groq.com": "AI",
  "perplexity.ai": "AI",
  "stability.ai": "AI",
  // Dev
  "github.com": "Dev",
  "stackoverflow.com": "Dev",
  "dev.to": "Dev",
  "news.ycombinator.com": "Dev",
  "ycombinator.com": "Dev",
  "slashdot.org": "Dev",
  "infoq.com": "Dev",
  "thenewstack.io": "Dev",
  "lwn.net": "Dev",
  "lobste.rs": "Dev",
  // Tech
  "techcrunch.com": "Tech",
  "theverge.com": "Tech",
  "wired.com": "Tech",
  "arstechnica.com": "Tech",
  "engadget.com": "Tech",
  "gizmodo.com": "Tech",
  "tomshardware.com": "Tech",
  "zdnet.com": "Tech",
  // Computing
  "arxiv.org": "Computing",
  "acm.org": "Computing",
  "ieee.org": "Computing",
  "computer.org": "Computing",
  "cacm.acm.org": "Computing",
  // Robotics
  "therobotreport.com": "Robotics",
  "roboticsbusinessreview.com": "Robotics",
  "robotics247.com": "Robotics",
  "automaton-media.com": "Robotics",
  // Electronics
  "spectrum.ieee.org": "Electronics",
  "allaboutcircuits.com": "Electronics",
  "electronicsweekly.com": "Electronics",
  "eejournal.com": "Electronics",
  "hackaday.com": "Electronics",
  "electropages.com": "Electronics",
  // Biology
  "nature.com": "Biology",
  "science.org": "Biology",
  "ncbi.nlm.nih.gov": "Biology",
  "pubmed.ncbi.nlm.nih.gov": "Biology",
  "pnas.org": "Biology",
  // Physics
  "physicstoday.scitation.org": "Physics",
  "physicsworld.com": "Physics",
  "aps.org": "Physics",
  "cern.ch": "Physics",
  // Chemistry
  "acs.org": "Chemistry",
  "rsc.org": "Chemistry",
  "chemistryworld.com": "Chemistry",
  // Space
  "nasa.gov": "Space",
  "spacex.com": "Space",
  "space.com": "Space",
  "spaceflightnow.com": "Space",
  "universetoday.com": "Space",
  "nasaspaceflight.com": "Space",
  "esa.int": "Space",
  "planetary.org": "Space",
  // Health
  "webmd.com": "Health",
  "healthline.com": "Health",
  "mayoclinic.org": "Health",
  "nih.gov": "Health",
  "who.int": "Health",
  "medscape.com": "Health",
  "statnews.com": "Health",
  "medicalnewstoday.com": "Health",
  // Business
  "bloomberg.com": "Business",
  "forbes.com": "Business",
  "wsj.com": "Business",
  "ft.com": "Business",
  "economist.com": "Business",
  "businessinsider.com": "Business",
  "hbr.org": "Business",
  "inc.com": "Business",
  "crunchbase.com": "Business",
  "venturebeat.com": "Business",
  // Finance
  "investopedia.com": "Finance",
  "morningstar.com": "Finance",
  "fool.com": "Finance",
  "marketwatch.com": "Finance",
  "seekingalpha.com": "Finance",
  "coindesk.com": "Finance",
  "coingecko.com": "Finance",
  // Politics
  "politico.com": "Politics",
  "thehill.com": "Politics",
  "rollcall.com": "Politics",
  "fivethirtyeight.com": "Politics",
  // World
  "reuters.com": "World",
  "apnews.com": "World",
  "bbc.com": "World",
  "aljazeera.com": "World",
  "foreignpolicy.com": "World",
  "defenseone.com": "World",
  "militarytimes.com": "World",
  // Sport
  "bbc.com/sport": "Sport",
  "espn.com": "Sport",
  "skysports.com": "Sport",
  "bleacherreport.com": "Sport",
  "theathletic.com": "Sport",
  "goal.com": "Sport",
  "transfermarkt.com": "Sport",
  "formula1.com": "Sport",
  // Music
  "open.spotify.com": "Music",
  "soundcloud.com": "Music",
  "bandcamp.com": "Music",
  "pitchfork.com": "Music",
  "rollingstone.com": "Music",
  "nme.com": "Music",
  "consequence.net": "Music",
  // Guitar
  "ultimate-guitar.com": "Guitar",
  "guitarworld.com": "Guitar",
  "premierguitar.com": "Guitar",
  "justinguitar.com": "Guitar",
  "fender.com": "Guitar",
  "gibson.com": "Guitar",
  // Entertainment
  "imdb.com": "Entertainment",
  "rottentomatoes.com": "Entertainment",
  "variety.com": "Entertainment",
  "hollywoodreporter.com": "Entertainment",
  "avclub.com": "Entertainment",
  "vulture.com": "Entertainment",
  // Education
  "coursera.org": "Education",
  "edx.org": "Education",
  "khanacademy.org": "Education",
  "udemy.com": "Education",
  "mit.edu": "Education",
  // Food
  "seriouseats.com": "Food",
  "bonappetit.com": "Food",
  "eater.com": "Food",
  "food52.com": "Food",
  "allrecipes.com": "Food",
  // Culture
  "theatlantic.com": "Culture",
  "newyorker.com": "Culture",
  "vox.com": "Culture",
  "slate.com": "Culture",
  // History
  "historydaily.org": "History",
  "smithsonianmag.com": "History",
  "historytoday.com": "History",
  // Philosophy
  "plato.stanford.edu": "Philosophy",
  "iep.utm.edu": "Philosophy",
  "philosophybites.com": "Philosophy",
  "aeon.co": "Philosophy",
};

const KEYWORD_RULES: { pattern: RegExp; category: string }[] = [
  // AI — before Dev to win on overlap
  { pattern: /\b(chatgpt|openai|anthropic|deepmind|gemini|copilot|\bllm\b|gpt-?[0-9]|artificial intelligence|machine learning|deep learning|neural network|generative ai|large language model|ai model|ai agent|ai-powered)\b/i, category: "AI" },
  // Guitar — before Music to win on overlap
  { pattern: /\b(guitar|chord progression|guitar tab|guitar riff|fingerpicking|fingerstyle|acoustic guitar|electric guitar|fretboard|strumming|luthier|guitar lesson|guitar solo|guitar tone|pedal board|noodling|shredding)\b/i, category: "Guitar" },
  // Music
  { pattern: /\b(album|song|band|singer|rapper|musician|concert|tour|music video|grammy|brit award|vinyl|single release|hip.?hop|jazz|classical music|pop star|music festival|chart|number one|record label|discography)\b/i, category: "Music" },
  // Sport
  { pattern: /\b(football|soccer|basketball|tennis|cricket|rugby|formula.?1|f1|athletics|cycling|olympics|premier league|champions league|fa cup|nba|nfl|mlb|transfer|match report|goal|penalty shootout|world cup|grand prix|wimbledon|sport)\b/i, category: "Sport" },
  // Space
  { pattern: /\b(nasa|spacex|rocket launch|astronaut|spacecraft|orbit|satellite|asteroid|comet|exoplanet|telescope|starship|space station|lunar|moon landing|mars mission|black hole|space agency|space exploration|iss)\b/i, category: "Space" },
  // World — war/conflict/international before Politics to win
  { pattern: /\b(war|ceasefire|troops|soldiers|airstrike|air strike|missile|bombing|invasion|insurgency|combat|casualties|hostage|siege|battle|shelling|drone strike|geopolit|foreign policy|international relations|sanctions|nato|un security council|refugee|humanitarian)\b/i, category: "World" },
  // Health
  { pattern: /\b(cancer|vaccine|virus|pandemic|epidemic|hospital|patient|disease|surgery|drug|medication|nhs|mental health|obesity|diabetes|alzheimer|dementia|clinical trial|outbreak|infection|treatment|therapy|diagnosis|doctor|medical)\b/i, category: "Health" },
  // Brain Science — before Health and Biology to win on overlap
  { pattern: /\b(neuroscience|brain science|brain|neural circuit|neuron|synapse|cognitive science|cognition|memory|attention|consciousness|fmri|neuroimaging|neuroplasticity|dopamine|serotonin)\b/i, category: "Brain Science" },
  // Biology
  { pattern: /\b(biology|biological|genome|genomics|gene editing|crispr|dna|rna|cell biology|microbiology|evolution|species|fossil|ecology|enzyme|protein|immune system|immunology|virus|bacteria)\b/i, category: "Biology" },
  // Physics
  { pattern: /\b(physics|quantum|particle physics|relativity|astrophysics|cosmology|matter|energy|electron|proton|neutron|photon|atom|nuclear|superconduct|thermodynamics|mechanics)\b/i, category: "Physics" },
  // Chemistry
  { pattern: /\b(chemistry|chemical|molecule|molecular|compound|reaction|catalyst|polymer|material science|materials science|organic chemistry|inorganic chemistry|biochemistry|laboratory experiment)\b/i, category: "Chemistry" },
  // Robotics
  { pattern: /\b(robotics|robotic|robot|humanoid robot|industrial robot|autonomous robot|cobot|drone|autonomous drone|actuator|servo motor|mechatronics|robot arm|quadruped|bipedal|slam|simultaneous localization and mapping)\b/i, category: "Robotics" },
  // Electronics
  { pattern: /\b(electronics|electronic|circuit|pcb|printed circuit board|semiconductor|microchip|microcontroller|sensor|transistor|diode|capacitor|resistor|fpga|embedded system|integrated circuit|chip fabrication|wafer|soldering)\b/i, category: "Electronics" },
  // Tech
  { pattern: /\b(technology|tech|gadget|smartphone|iphone|android|laptop|tablet|wearable|smartwatch|vr headset|augmented reality|virtual reality|consumer tech|platform|app store|social media platform|big tech)\b/i, category: "Tech" },
  // Computing
  { pattern: /\b(computing|computer science|algorithm|data structure|operating system|compiler|distributed system|database|networking|cybersecurity|cryptography|cloud computing|high-performance computing|hpc|supercomputer)\b/i, category: "Computing" },
  // Dev
  { pattern: /\b(software|open.?source|programming|developer|typescript|javascript|python|rust|golang|kubernetes|docker|devops|api|framework|database|cloud computing|linux|terminal|cli|compiler|debugging|pull request|open source)\b/i, category: "Dev" },
  // Finance — before Business to win on overlap
  { pattern: /\b(investing|portfolio|dividend|etf|index fund|crypto|bitcoin|ethereum|defi|personal finance|retirement|savings account|compound interest|stock pick|options trading|hedge fund|asset allocation|net worth)\b/i, category: "Finance" },
  // Business
  { pattern: /\b(economy|inflation|recession|gdp|market|shares|billion|trade|tariff|bank|interest rate|venture capital|ipo|merger|acquisition|ceo|startup|saas|revenue|earnings|unemployment|supply chain|energy prices)\b/i, category: "Business" },
  // History
  { pattern: /\b(history|historical|ancient|medieval|world war|century|civilization|empire|dynasty|archaeology|artifact|antiquity|renaissance|revolution|cold war|colonial|prehistoric|roman|greek|egyptian|ottoman)\b/i, category: "History" },
  // Philosophy
  { pattern: /\b(philosophy|philosophical|ethics|metaphysics|epistemology|ontology|existential|consciousness|free will|stoicism|nietzsche|kant|plato|aristotle|socrates|moral|virtue|logic|phenomenology)\b/i, category: "Philosophy" },
  // Food
  { pattern: /\b(recipe|cooking|restaurant|chef|cuisine|meal|ingredient|baking|foodie|street food|tasting menu|michelin|barbecue|grilling|spice|ferment|sourdough|pasta|sushi|ramen|cocktail|wine|beer)\b/i, category: "Food" },
  // Entertainment
  { pattern: /\b(film|movie|cinema|tv show|television|series|netflix|disney\+|streaming|actor|actress|director|oscar|bafta|emmy|box office|trailer|premiere|sitcom|documentary|comedian|stand.?up)\b/i, category: "Entertainment" },
  // Politics
  { pattern: /\b(government|minister|president|prime minister|parliament|senate|congress|election|vote|ballot|political party|policy|legislation|democrat|republican|labour|conservative|white house|downing street|kremlin|g7|g20|summit|diplomatic)\b/i, category: "Politics" },
  // Education
  { pattern: /\b(school|students?|university|college|teacher|professor|tuition|exam|curriculum|graduation|scholarship|education|classroom|higher education|learning|online course)\b/i, category: "Education" },
  // Culture
  { pattern: /\b(art|museum|gallery|exhibition|literature|novel|author|poet|culture|fashion|architecture|heritage|identity|social commentary|immigration|religion|tradition|subculture)\b/i, category: "Culture" },
  // Spicy
  { pattern: /\b(hot take|unpopular opinion|controversial|spicy take|change my mind|debate|divisive|problematic|cancel|culture war|discourse|ratio|this is fine)\b/i, category: "Spicy" },
];

export function suggestCategory(
  url: string,
  title: string,
  categories: { name: string }[],
): string | null {
  const categoryNames = new Set(categories.map((c) => c.name));

  // 1. Domain match
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, "");
    if (DOMAIN_RULES[hostname] && categoryNames.has(DOMAIN_RULES[hostname])) {
      return DOMAIN_RULES[hostname];
    }
    // Try base domain (strip one subdomain level)
    const parts = hostname.split(".");
    if (parts.length > 2) {
      const base = parts.slice(-2).join(".");
      if (DOMAIN_RULES[base] && categoryNames.has(DOMAIN_RULES[base])) {
        return DOMAIN_RULES[base];
      }
    }
  } catch { /* invalid URL */ }

  // 2. Keyword match on title + URL path
  const text = `${title} ${url}`;
  for (const { pattern, category } of KEYWORD_RULES) {
    if (pattern.test(text) && categoryNames.has(category)) return category;
  }

  return null;
}
