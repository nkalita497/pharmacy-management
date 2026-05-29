import { resetAndSeedDatabase } from './pharmacySeed';

resetAndSeedDatabase()
  .then(() => {
    console.log('Baza apteki zaktualizowana danymi demonstracyjnymi.');
    process.exit(0);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
