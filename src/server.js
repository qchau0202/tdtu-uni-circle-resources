const app = require('./app');
const config = require('./config');

const PORT = config.port || 3005;

app.listen(PORT, () => {
  console.log(`Resource Service running on port ${PORT}`);
  console.log(`Environment: ${config.env}`);
});
