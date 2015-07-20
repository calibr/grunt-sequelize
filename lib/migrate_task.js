'use strict';

var Umzug = require('umzug');
var Sequelize = require('sequelize');
var DataTypes = require('sequelize/lib/data-types');

function createMigrator(opts) {
  var db = new Sequelize(opts.dbname, opts.user, opts.password,  {
    host: opts.host,
    dialect: 'mysql',
    pool: opts.pool,
    port: opts.port,
    logging: false
  });

  return new Umzug({
    storage: 'sequelize',
    storageOptions: {
      sequelize: db,
      tableName: 'SequelizeMeta'
    },
    upName: 'up',
    downName: 'down',
    migrations: {
      params: [ db.getQueryInterface(), DataTypes ],
      path: opts.migrationsPath,
      pattern: /\.js$/
    },
    logging: opts.log
  });
}

module.exports = function createMigrateTask(opts) {
  var migrator = createMigrator(opts);
  var task = Object.create(migrator);

  task.undo = task.down;

  task.redo = function () {
    return this.down()
      .bind(this)
      .then(function () {
        return this.up();
      });
  };

  task.init = function () {
    return this.storage.executed();
  };

  return task;
};

module.exports.createMigrator = createMigrator;
