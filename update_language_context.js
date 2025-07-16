const fs = require("fs");
const path = require("path");

const pagesToUpdate = [
  "src/app/pacotes/page.tsx",
  "src/app/otc/page.tsx",
  "src/app/negociacao-maxima/page.tsx",
  "src/app/negociacao-basica/page.tsx",
  "src/app/portfolio/page.tsx",
  "src/app/extrato/page.tsx",
];

pagesToUpdate.forEach((pagePath) => {
  if (fs.existsSync(pagePath)) {
    let content = fs.readFileSync(pagePath, "utf8");

    // Add import for useLanguage
    if (!content.includes("useLanguage")) {
      content = content.replace(
        /import Navbar from "@\/components\/ui\/navbar";/,
        'import Navbar from "@/components/ui/navbar";\nimport { useLanguage } from "@/components/providers/language-provider";'
      );
    }

    // Replace local state with context
    content = content.replace(
      /const \[lang, setLang\] = useState<"en" \| "br">\("br"\);?/,
      "const { lang, setLang, t } = useLanguage();"
    );

    // Update Navbar props
    content = content.replace(
      /<Navbar[^>]*lang={lang}[^>]*setLang={setLang}[^>]*isLoggingOut={isLoggingOut}[^>]*handleLogout={handleLogout}[^>]*\/?>/g,
      "<Navbar isLoggingOut={isLoggingOut} handleLogout={handleLogout} />"
    );

    fs.writeFileSync(pagePath, content);
    console.log(`Updated ${pagePath}`);
  } else {
    console.log(`File not found: ${pagePath}`);
  }
});

console.log("Language context update complete!");
