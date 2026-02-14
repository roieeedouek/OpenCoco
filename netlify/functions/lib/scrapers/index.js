/**
 * Scraper registry - loads all available scrapers.
 */
const scrapers = [
  require('./piratebay'),
  require('./the1337x'),
  require('./torrentgalaxy'),
  require('./bitsearch'),
  require('./eztv'),
  require('./torrentdownload'),
  require('./kickass'),
  require('./nyaa'),
  require('./ytsmx'),
  require('./knaben'),
  require('./torrentquest'),
];

module.exports = scrapers;
