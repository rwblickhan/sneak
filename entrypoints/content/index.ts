import "./style.scss";
import * as LinkHelpers from "./link_helpers";

export default defineContentScript({
  matches: ["<all_urls>"],
  cssInjectionMode: "ui",
  async main(ctx) {
    const ui = await createShadowRootUi(ctx, {
      name: "sneak-tooltip",
      position: "overlay",
      alignment: "bottom-right",
      onMount(container) {
        container.append(document.createElement("p"));
      }
    });
    ui.mount();

    const coreUi = ui.uiContainer.firstElementChild as HTMLParagraphElement;
    let isListening = false;
    let shouldOpenInNewTab = false;
    let links: LinkHelpers.Link[] = [];
    let prefixLinks: LinkHelpers.Link[] = [];
    let prefixString = "";
    let resetTimer: NodeJS.Timeout | null = null;

    coreUi.style.display = "none";

    document.addEventListener("keydown", function (event) {
      if (hasActiveElement(document)) {
        console.log(`Sneak: Ignoring due to active element...`);
        return;
      }

      if (
        isListening &&
        (event.metaKey || event.ctrlKey) &&
        !Number.isNaN(parseInt(event.key))
      ) {
        event.preventDefault();
        event.stopPropagation();
        handleSelection(parseInt(event.key)).catch((e) => {
          console.error(e);
          reset();
        });
        return;
      }

      if (hasExitCharacter(event)) {
        if (isListening) {
          setUiContentsAndHide("Canceling...");
        } else {
          console.log(`Sneak: Ignoring due to control character...`);
        }
        return;
      }

      if (!isListening && hasInitCharacter(event)) {
        event.preventDefault();
        event.stopPropagation();
        isListening = true;
        shouldOpenInNewTab = event.shiftKey;
        links = LinkHelpers.getAllLinks();
        setUiContents("");
        return;
      }

      if (isListening && !event.metaKey && !event.ctrlKey) {
        event.preventDefault();
        event.stopPropagation();
        appendPrefixCharacter(event.key.trim());
        return;
      }
    });

    const hasActiveElement = (document: Document) => {
      return (
        !!document.activeElement && document.activeElement !== document.body
      );
    };

    const hasInitCharacter = (event: KeyboardEvent) => {
      return event.key === "s" || event.key === "S";
    };

    const hasExitCharacter = (event: KeyboardEvent) => {
      return event.key === "Escape" || event.key === "Backspace";
    };

    function appendPrefixCharacter(c: string) {
      prefixString += c;
      setUiContents(prefixString);
      prefixLinks = LinkHelpers.findPrefixLinks(links, prefixString);
      if (prefixString.length >= 2) {
        switch (prefixLinks.length) {
          case 0:
            setUiContentsAndHide(`No matches for ${prefixString}!`);
            break;
          case 1:
            handleFollowLink(prefixLinks[0].url).catch((e) => {
              console.error(e);
              reset();
            });
            break;
          default: {
            const options = prefixLinks
              .map((link, index) => {
                return `Cmd-${index + 1}: ${link.text} (${link.url})`;
              })
              .join("\n\n");
            setUiContents(`${prefixString}\n\n${options}`);
            break;
          }
        }
      }
    }

    async function handleSelection(index: number) {
      if (prefixLinks.length > 1 && 0 < index && index <= prefixLinks.length) {
        const linkUrl = prefixLinks[index - 1].url;
        reset();
        await handleFollowLink(linkUrl);
      }
    }

    async function handleFollowLink(url: string) {
      reset();
      if (shouldOpenInNewTab) {
        await browser.runtime.sendMessage({ url });
      } else {
        window.location.href = url;
      }
    }

    function reset() {
      isListening = false;
      shouldOpenInNewTab = false;
      prefixString = "";
      links = [];
      prefixLinks = [];
      coreUi.style.display = "none";
    }

    const setUiContents = (message: string) => {
      coreUi.style.display = "block";
      coreUi.textContent = `Sneak: ${message}`;
    };

    const setUiContentsAndHide = (message: string) => {
      setUiContents(message);
      if (resetTimer) {
        clearTimeout(resetTimer);
      }
      resetTimer = setTimeout(() => {
        reset();
      }, 500);
    };
  }
});
