export interface Link {
  url: string;
  humanText: string;
  searchText: string;
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
      humanText: text,
      searchText: text.toLocaleLowerCase().replace(/\s/g, "")
    });
  }
  return linksUrls;
}

export function findPrefixLinks(links: Link[], prefixString: string) {
  const prefixLinks = [];
  for (const link of links) {
    if (link.searchText.startsWith(prefixString)) {
      prefixLinks.push(link);
    }
  }
  // If we didn't find any prefix strings, fallback on internal matches
  if (prefixLinks.length === 0) {
    for (const link of links) {
      if (link.searchText.includes(prefixString)) {
        prefixLinks.push(link);
      }
    }
  }
  return prefixLinks;
}
