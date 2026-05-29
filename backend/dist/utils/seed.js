"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const pharmacySeed_1 = require("./pharmacySeed");
(0, pharmacySeed_1.resetAndSeedDatabase)()
    .then(() => {
    console.log('Baza apteki zaktualizowana danymi demonstracyjnymi.');
    process.exit(0);
})
    .catch((err) => {
    console.error(err);
    process.exit(1);
});
//# sourceMappingURL=seed.js.map