export interface Link {
  element: HTMLElement;
  humanText: string;
  searchText: string;
}

export function getAllLinks(): Link[] {
  const links: Link[] = [];

  const aElements = document.querySelectorAll("a");
  const buttonElements = document.querySelectorAll("button");
  const inputElements = document.querySelectorAll("input");

  aElements.forEach((element) => {
    links.push(parseElement(element));
  });

  buttonElements.forEach((element) => {
    links.push(parseElement(element));
  });

  inputElements.forEach((element) => {
    links.push(parseElement(element));
  });

  return links;
}

function parseElement(element: HTMLElement): Link {
  const textContent = (element.textContent ?? "").trim();
  const ariaLabel = (element.getAttribute("aria-label") ?? "").trim();
  const title = (element.getAttribute("title") ?? "").trim();
  const text =
    textContent.length > 0
      ? textContent
      : ariaLabel.length > 0
        ? ariaLabel
        : title.length > 0
          ? title
          : "";
  return {
    element: element,
    humanText: text,
    searchText: text
      .toLocaleLowerCase()
      .replace(/\s/g, "")
      .replace(";", "")
      .replace(",", "")
  };
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
  console.log(JSON.stringify(prefixLinks, null, 2));
  return prefixLinks;
}
