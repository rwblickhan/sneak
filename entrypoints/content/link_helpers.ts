export interface Link {
  url: string;
  text: string;
}

export function getAllLinks(): Link[] {
  const links = document.querySelectorAll("a");
  const linksUrls = [];
  for (const link of links) {
    const textContent = (link.textContent ?? "").trim();
    const title = (link.getAttribute("title") ?? "").trim();
    const ariaLabel = (link.getAttribute("aria-label") ?? "").trim();
    const text =
      textContent.length > 0
        ? textContent
        : title.length > 0
          ? title
          : ariaLabel.length > 0
            ? ariaLabel
            : "";
    linksUrls.push({
      url: link.href,
      text: text.toLocaleLowerCase().replace(/\s/g, "")
    });
  }
  console.log(JSON.stringify(linksUrls));
  return linksUrls;
}

export function findPrefixLinks(links: Link[], prefixString: string) {
  const prefixLinks = [];
  for (const link of links) {
    if (link.text.startsWith(prefixString)) {
      prefixLinks.push(link);
    }
  }
  console.log(`Sneak: Matching URLs ${JSON.stringify(prefixLinks)}`);
  return prefixLinks;
}
