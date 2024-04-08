import * as LinkHelpers from "./link_helpers";

export default defineContentScript({
  matches: ["<all_urls>"],
  async main(ctx) {
    const uiContainer = createContainerElement();
    const uiSecondaryMessage = createMessageElement();
    const uiMainMessage = createMessageElement();
    uiContainer.append(uiSecondaryMessage);
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
    let globalDirection: "forward" | "backward" = "forward";
    let links: LinkHelpers.Link[] = [];
    let prefixLinks: LinkHelpers.Link[] = [];
    let prefixString = "";
    let resetTimer: NodeJS.Timeout | null = null;
    let selectionIndex = 0;

    uiContainer.style.display = "none";

    document.addEventListener("keydown", function (event) {
      if (isListening && hasFinishCharacter(event)) {
        if (
          !(document.activeElement instanceof HTMLAnchorElement) &&
          !(document.activeElement instanceof HTMLButtonElement)
        ) {
          event.preventDefault();
          event.stopImmediatePropagation();
        }
        close();
        return;
      }

      if (hasCancelCharacter(event)) {
        if (document.activeElement instanceof HTMLElement) {
          document.activeElement.blur();
        }
        close();
        return;
      }

      if (isListening && event.key === "Tab") {
        event.preventDefault();
        event.stopImmediatePropagation();
        let direction = globalDirection;
        if (event.shiftKey) {
          direction = direction === "forward" ? "backward" : "forward";
        }
        handleMoveSelection(direction);
        return;
      }

      if (
        isListening &&
        !event.metaKey &&
        !event.ctrlKey &&
        !event.shiftKey &&
        !hasInitCharacter(event)
      ) {
        event.preventDefault();
        event.stopImmediatePropagation();
        console.log(`Sneak: Appending new character ${event.key}`);
        appendPrefixCharacter(event.key.trim());
        return;
      }

      if (hasActiveElement(document)) {
        console.log(`Sneak: Ignoring due to active element...`);
        if (hasInitCharacter(event)) {
          setMainMessageAndHide(`Ignoring due to active element...`);
        }
        return;
      }

      if (hasInitCharacter(event)) {
        event.preventDefault();
        event.stopImmediatePropagation();
        reset(0);
        console.log("Sneak: Listening...");
        isListening = true;
        globalDirection = hasForwardInitCharacter(event)
          ? "forward"
          : "backward";
        links = LinkHelpers.getAllLinks();
        setMessage("");
        return;
      }
    });

    const close = () => {
      if (isListening) {
        setMainMessageAndHide("Closing...");
        console.log(`Sneak: Closing due to control character...`);
      } else {
        console.log(`Sneak: Ignoring due to control character...`);
      }
    };

    const hasActiveElement = (document: Document) => {
      return (
        !!document.activeElement && document.activeElement !== document.body
      );
    };

    const hasInitCharacter = (event: KeyboardEvent) => {
      return hasForwardInitCharacter(event) || hasBackwardInitCharacter(event);
    };

    const hasForwardInitCharacter = (event: KeyboardEvent) => {
      return event.key === "/";
    };

    const hasBackwardInitCharacter = (event: KeyboardEvent) => {
      return event.key === "?";
    };

    const hasFinishCharacter = (event: KeyboardEvent) => {
      return event.key === "Enter";
    };

    const hasCancelCharacter = (event: KeyboardEvent) => {
      return event.key === "Escape";
    };

    function appendPrefixCharacter(c: string) {
      prefixString += c;
      setMessage(prefixString);
      prefixLinks = LinkHelpers.findPrefixLinks(links, prefixString);

      if (prefixLinks.length === 0) {
        setMainMessageAndHide(`No matches for ${prefixString}!`);
        return;
      }

      if (prefixString.length >= 2) {
        handleFocus(globalDirection === "forward" ? 0 : prefixLinks.length - 1);
      }
    }

    function mod(n: number, m: number) {
      return ((n % m) + m) % m;
    }

    function handleMoveSelection(direction: "forward" | "backward") {
      if (direction === "forward") {
        selectionIndex = mod(selectionIndex + 1, prefixLinks.length);
      } else {
        selectionIndex = mod(selectionIndex - 1, prefixLinks.length);
      }
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
      setMessage(prefixString, `${index + 1} of ${prefixLinks.length} matches`);
      const p = createMessageElement();
      p.textContent = prefixLinks[index].humanText;
      uiContainer.prepend(p);
    }

    const setMessage = (message: string, secondaryMessage?: string) => {
      uiContainer.replaceChildren(uiSecondaryMessage, uiMainMessage);
      if (secondaryMessage) {
        uiSecondaryMessage.style.display = "block";
        uiSecondaryMessage.textContent = secondaryMessage;
      } else {
        uiSecondaryMessage.style.display = "none";
      }
      uiContainer.style.display = "block";
      uiMainMessage.textContent = `Sneak: ${message}`;
    };

    const setMainMessageAndHide = (message: string) => {
      setMessage(message);
      reset(500);
    };

    function reset(timeout?: number) {
      const onReset = () => {
        isListening = false;
        prefixString = "";
        links = [];
        prefixLinks = [];
        selectionIndex = 0;
        uiContainer.style.display = "none";
      };

      if (resetTimer) {
        clearTimeout(resetTimer);
      }

      if (timeout) {
        resetTimer = setTimeout(onReset, timeout);
      } else {
        // Handle this immediately, so that we can hide and then show again in the same pass
        onReset();
      }
    }

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
