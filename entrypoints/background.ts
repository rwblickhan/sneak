import { Message } from "@/types/types";

export default defineBackground(() => {
  console.log("Hello background!", { id: browser.runtime.id });

  async function handleOpenLink(message: Message) {
    if (message.id === "open_link" && message.url) {
      await browser.tabs.create({ url: message.url });
    } else {
      console.error(`Invalid message received from content script: ${message}`);
    }
  }
  browser.runtime.onMessage.addListener(handleOpenLink);
});
