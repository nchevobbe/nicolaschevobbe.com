onmessage = function (e) {
  console.log("⚙️ Message received in worker", e, globalThis);
  const { type } = e.data;

  if (type == "delay") {
    console.info("delay, echoing ", e.data.message, "in", e.data.delay, "ms");
    setTimeout(() => {
      postMessage(`··${e.data.message}··`);
    }, e.data.delay);
  }
};
