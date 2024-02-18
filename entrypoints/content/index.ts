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
    let prefixString = "";
    let resetTimer: NodeJS.Timeout | null = null;

    document.addEventListener("keydown", function (event) {
      if (hasActiveElement(document)) {
        console.log(`Sneak: Ignoring due to active element...`);
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

      if (isListening) {
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
      return (
        event.ctrlKey ||
        event.metaKey ||
        event.key === "CommandOrCtrl" ||
        event.key === "Escape" ||
        event.key === "Backspace"
      );
    };

    function appendPrefixCharacter(c: string) {
      prefixString += c;
      setUiContents(prefixString);
      if (prefixString.length >= 2) {
        const prefixLinks = LinkHelpers.findPrefixLinks(links, prefixString);
        switch (prefixLinks.length) {
          case 0:
            setUiContentsAndHide(`No matches for ${prefixString}!`);
            break;
          case 1:
            handleSelection(prefixLinks[0].url).catch((e) => {
              console.error(e);
              reset();
            });
            break;
          default: {
            const options = prefixLinks
              .map((link, index) => {
                return `Cmd-${index}: ${link.text} (${link.url})`;
              })
              .join("\n\n");
            setUiContents(`${prefixString}\n\n${options}`);
            break;
          }
        }
      }
    }

    async function handleSelection(url: string) {
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
      }, 750);
    };
  }
});
