# Assets and external components

The optional SVG companion, favicon, CSS artwork, personality JSON, original examples and audition text were created for this project. System fonts are used; no third-party font files are downloaded. No cloned voice, scraped audio or reaction sample is bundled.

At the user's request, the default visual model now uses their supplied `mao_en` folder: **Niziiro Mao PRO**, illustration and modeling © Live2D Inc. This artwork is not original to Hiraya. The supplied `mao_en/ReadMe.txt` is preserved and linked in the UI. It identifies the Free Material License Agreement and Sample Data Terms, including different uses for different user categories. See the [official model page](https://www.live2d.com/en/learn/sample/niziiro-mao/) and review the linked terms for your intended use. No model assets were sourced from a streamer.

Cloud voices are synthetic provider services used with the account holder’s own credentials and subject to that provider’s terms. Voice/model listing does not grant rights to imitate a real person. No voice cloning functionality is provided.

The core chat app has no third-party npm runtime dependencies. Node and its bundled SQLite retain their upstream licensing. The optional browser-test package pins Microsoft Playwright 1.58.2. The optional browser avatar uses MIT-licensed PixiJS 7.4.3, its CSP patch, and pixi-live2d-display-lipsyncpatch 0.5.0-ls-8; the setup helper retains available package license files. Cubism Core must be supplied from the official SDK under its separate terms. See [MODEL_SETUP.md](MODEL_SETUP.md). Neither the SDK nor these runtime packages could be installed in this environment. The VTube Studio integration does not bundle VTube Studio itself.

Open-LLM-VTuber was consulted as a reference, with no reused code or assets. Its separate sample-model terms were not treated as a general permission for reuse. The user-provided YouTube and Character.AI references were not copied into the product.
