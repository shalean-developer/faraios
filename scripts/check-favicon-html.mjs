const urls = [
  "https://faraios.vercel.app/",
  "https://faraios.vercel.app/book/235e9d72-b5c0-4b6e-b1ae-d6431cd6a992?embed=1",
];

for (const url of urls) {
  const html = await (await fetch(url)).text();
  const icons = [...html.matchAll(/rel="([^"]*icon[^"]*)"[^>]*href="([^"]+)"/gi)].map((m) => `${m[1]} -> ${m[2]}`);
  const icons2 = [...html.matchAll(/href="([^"]+)"[^>]*rel="([^"]*icon[^"]*)"/gi)].map((m) => `${m[2]} -> ${m[1]}`);
  console.log("\n", url);
  console.log([...icons, ...icons2].join("\n") || "(no icon links)");
}
