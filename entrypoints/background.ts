import { Message } from "@/types/types";

export default defineBackground(() => {
  console.log("Hello background!", { id: browser.runtime.id });

  async function handleOpenLink(message: Message) {
    await browser.tabs.create({ url: message.url });
  }
  browser.runtime.onMessage.addListener(handleOpenLink);
});
