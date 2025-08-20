const app = require('./app');
const { PORT } = require('../config/env');
const logger = require('../utils/logger');

app.listen(PORT, () => {
  logger.info(`Hotel bot server running on port ${PORT}`);
});
