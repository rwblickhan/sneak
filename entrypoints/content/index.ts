import "./style.scss";
import * as LinkHelpers from "./link_helpers";

export default defineContentScript({
  matches: ["<all_urls>"],
  cssInjectionMode: "ui",
  async main(ctx) {
    const uiBody = document.createElement("div");
    const uiMainMessage = document.createElement("p");
    uiBody.append(uiMainMessage);

    const ui = await createShadowRootUi(ctx, {
      name: "sneak-tooltip",
      position: "overlay",
      alignment: "bottom-right",
      onMount(container) {
        container.append(uiBody);
      }
    });
    ui.mount();

    let isListening = false;
    let shouldOpenInNewTab = false;
    let links: LinkHelpers.Link[] = [];
    let prefixLinks: LinkHelpers.Link[] = [];
    let prefixString = "";
    let resetTimer: NodeJS.Timeout | null = null;

    uiBody.style.display = "none";

    document.addEventListener("keydown", function (event) {
      if (hasActiveElement(document)) {
        setMainMessageAndHide(`Ignoring due to active element...`);
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
          setMainMessageAndHide("Canceling...");
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
        setMainMessage("");
        return;
      }

      if (isListening && !event.metaKey && !event.ctrlKey && !event.shiftKey) {
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
        event.key === "Escape" ||
        event.key === "Backspace" ||
        event.key === "Enter" ||
        event.key === "Shift"
      );
    };

    function appendPrefixCharacter(c: string) {
      prefixString += c;
      setMainMessage(prefixString);
      prefixLinks = LinkHelpers.findPrefixLinks(links, prefixString);
      if (prefixString.length >= 2) {
        switch (prefixLinks.length) {
          case 0:
            setMainMessageAndHide(`No matches for ${prefixString}!`);
            break;
          case 1:
            handleFollowLink(prefixLinks[0].url).catch((e) => {
              console.error(e);
              reset();
            });
            break;
          default: {
            setMainMessage(prefixString);
            const options = prefixLinks.map(
              (link, index) => `${index + 1}: ${link.humanText}`
            );
            for (const option of options.toReversed()) {
              const p = document.createElement("p");
              p.textContent = option;
              uiBody.prepend(p);
            }
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
      uiBody.style.display = "none";
    }

    const setMainMessage = (message: string) => {
      uiBody.replaceChildren(uiMainMessage);
      uiBody.style.display = "block";
      uiMainMessage.textContent = `Sneak: ${message}`;
    };

    const setMainMessageAndHide = (message: string) => {
      setMainMessage(message);
      if (resetTimer) {
        clearTimeout(resetTimer);
      }
      resetTimer = setTimeout(() => {
        reset();
      }, 500);
    };
  }
});
