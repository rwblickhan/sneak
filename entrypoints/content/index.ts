import * as LinkHelpers from "./link_helpers";

export default defineContentScript({
  matches: ["<all_urls>"],
  async main(ctx) {
    const uiContainer = createContainerelement();
    const uiMainMessage = createMessageElement();
    uiContainer.append(uiMainMessage);

    const ui = await createShadowRootUi(ctx, {
      name: "sneak-tooltip",
      position: "overlay",
      alignment: "bottom-right",
      onMount(container) {
        container.append(uiContainer);
      }
    });
    ui.mount();

    let isListening = false;
    let shouldOpenInNewTab = false;
    let links: LinkHelpers.Link[] = [];
    let prefixLinks: LinkHelpers.Link[] = [];
    let prefixString = "";
    let resetTimer: NodeJS.Timeout | null = null;

    uiContainer.style.display = "none";

    document.addEventListener("keydown", function (event) {
      if (hasActiveElement(document)) {
        console.log(`Sneak: Ignoring due to active element...`);
        if (hasInitCharacter(event)) {
          setMainMessageAndHide(`Ignoring due to active element...`);
        }
        return;
      }

      if (
        isListening &&
        (event.metaKey || event.ctrlKey) &&
        !Number.isNaN(parseInt(event.key))
      ) {
        event.preventDefault();
        event.stopImmediatePropagation();
        handleSelection(parseInt(event.key)).catch((e) => {
          console.error(e);
          reset();
        });
        return;
      }

      if (hasExitCharacter(event)) {
        if (isListening) {
          setMainMessageAndHide("Canceling...");
          console.log(`Sneak: Canceling due to control character...`);
        } else {
          console.log(`Sneak: Ignoring due to control character...`);
        }
        return;
      }

      if (!isListening && hasInitCharacter(event)) {
        event.preventDefault();
        event.stopImmediatePropagation();
        console.log("Sneak: Listening...");
        isListening = true;
        shouldOpenInNewTab = event.shiftKey;
        links = LinkHelpers.getAllLinks();
        setMainMessage("");
        return;
      }

      if (isListening && !event.metaKey && !event.ctrlKey && !event.shiftKey) {
        event.preventDefault();
        event.stopImmediatePropagation();
        console.log(`Sneak: Appending new character ${event.key}`);
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
              const p = createMessageElement();
              p.textContent = option;
              uiContainer.prepend(p);
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
      uiContainer.style.display = "none";
    }

    const setMainMessage = (message: string) => {
      uiContainer.replaceChildren(uiMainMessage);
      uiContainer.style.display = "block";
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

    function createContainerelement(): HTMLDivElement {
      // Apply all styles directly instead of using css
      // because for SOME reason Safari doesn't apply the stylesheet correctly on some sites
      // (e.g. https://developer.apple.com/documentation/safariservices/safari_web_extensions/converting_a_web_extension_for_safari)
      const div = document.createElement("div");
      div.style.position = "fixed";
      div.style.bottom = "0";
      div.style.right = "0";
      div.style.backgroundColor = "white";
      div.style.padding = "0.5rem";
      div.style.color = "black";
      div.style.maxWidth = "50%";
      // Set this to a high value so it's not hidden
      div.style.zIndex = "100";
      return div;
    }

    function createMessageElement(): HTMLParagraphElement {
      const p = document.createElement("p");
      p.style.textAlign = "end";
      return p;
    }
  }
});
