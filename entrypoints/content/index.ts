import * as LinkHelpers from "./link_helpers";

export default defineContentScript({
  matches: ["<all_urls>"],
  async main(ctx) {
    const uiContainer = createContainerElement();
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
    let selectionIndex = 0;

    uiContainer.style.display = "none";

    document.addEventListener("keydown", function (event) {
      if (hasExitCharacter(event)) {
        if (isListening) {
          event.preventDefault();
          event.stopImmediatePropagation();
          setMainMessageAndHide("Canceling...");
          console.log(`Sneak: Canceling due to control character...`);
        } else {
          console.log(`Sneak: Ignoring due to control character...`);
        }
        return;
      }

      if (isListening && event.key === ";") {
        event.preventDefault();
        event.stopImmediatePropagation();
        handleForwardSelection();
        return;
      }

      if (isListening && event.key === ",") {
        event.preventDefault();
        event.stopImmediatePropagation();
        handleBackwardSelection();
        return;
      }

      if (hasActiveElement(document)) {
        console.log(`Sneak: Ignoring due to active element...`);
        if (hasInitCharacter(event)) {
          setMainMessageAndHide(`Ignoring due to active element...`);
        }
        return;
      }

      if (!isListening && hasInitCharacter(event)) {
        event.preventDefault();
        event.stopImmediatePropagation();
        console.log("Sneak: Listening...");
        isListening = true;
        shouldOpenInNewTab = event.shiftKey;
        console.log(`Should shouldOpenInNewTab: ${shouldOpenInNewTab}`);
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
      return event.key === "s";
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
      selectionIndex = 0;

      if (prefixLinks.length === 0) {
        setMainMessageAndHide(`No matches for ${prefixString}!`);
        return;
      }

      switch (prefixString.length) {
        case 0:
        case 1:
          return;
        case 2:
          handleFocus(0);
          break;
        default:
          setMainMessageAndHide(`No matches for ${prefixString}!`);
          return;
      }
    }

    function mod(n: number, m: number) {
      return ((n % m) + m) % m;
    }

    function handleForwardSelection() {
      selectionIndex = mod(selectionIndex + 1, prefixLinks.length);
      handleFocus(selectionIndex);
    }

    function handleBackwardSelection() {
      selectionIndex = mod(selectionIndex - 1, prefixLinks.length);
      handleFocus(selectionIndex);
    }

    function handleFocus(index: number) {
      if (!(0 <= index && index < prefixLinks.length)) {
        console.error(
          `Sneak: found invalid index: ${index}; only had ${prefixLinks.length} options`
        );
        return;
      }
      prefixLinks[index].element.focus();
      setMainMessage(prefixString);
      const p = createMessageElement();
      p.textContent = prefixLinks[index].humanText;
      uiContainer.prepend(p);
    }

    function handleBlur(index: number) {
      if (!(0 <= index && index < prefixLinks.length)) {
        console.error(
          `Sneak: found invalid index: ${index}; only had ${prefixLinks.length} options`
        );
        return;
      }
      prefixLinks[index].element.blur();
    }

    function reset() {
      handleBlur(selectionIndex);
      isListening = false;
      shouldOpenInNewTab = false;
      prefixString = "";
      links = [];
      prefixLinks = [];
      selectionIndex = 0;
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

    function createContainerElement(): HTMLDivElement {
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
      div.style.maxWidth = "25%";
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
