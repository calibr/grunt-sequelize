/*
 * grunt-sequelize
 * https://github.com/webcast-io/grunt-sequelize
 *
 * Copyright (c) 2013 Ben Evans
 * Licensed under the MIT license.
 */

'use strict';

var path = require('path');
var _ = require('lodash');
var utils = require('../lib/util');
var createMigrateTask = require('../lib/migrate_task');
var async = require('async');

module.exports = function (grunt) {

  function options(db_name) {
    var dbPath = path.normalize(path.join(__dirname, '../../../../db'));

    var taskOpts = _.defaults(grunt.config.get('sequelize.options'), {
      config: path.join(dbPath, 'config.json'),
      migrationsPath: path.join(dbPath, 'migrations')
    });

    if (taskOpts.packages && taskOpts.packages.hasOwnProperty(db_name)) {
      taskOpts.migrationsPath = path.join('node_modules', taskOpts.packages[db_name], 'migrations');
    }

    var config = require(path.normalize(path.join(__dirname, '../../../..', taskOpts.projectConfig)));

    var dbConfig = config.db[db_name];
    if (!dbConfig) {
      var err = new Error('No database configuration "' + db_name + '" found in the ' + taskOpts.config);
      grunt.log.error(err);
      throw err;
    }

    delete taskOpts.config;
    taskOpts.log = console.log;
    return _.extend(taskOpts, dbConfig);
  }

  function run_task(db_name, arg, cb) {
    var task = createMigrateTask(options(db_name));

    arg = arg || 'up';

    task.init()

      .then(function () {
        switch (arg) {
          case 'up':
            grunt.log.writeln('Running pending migrations...');
            return task.up();
          case 'down': /* falls through */
          case 'undo':
            grunt.log.writeln('Undoing last migration...');
            return task.down();
          case 'redo':
            grunt.log.writeln('Redoing last migration...');
            return task.redo();
          default:
            var err = new Error('Unknown task: sequelize:migrate:' + arg);
            grunt.log.error(err);
            throw err;
        }
      })

      .then(function () {
        grunt.log.writeln('Done!');
      })


      .finally(cb);
  }

  grunt.registerTask('sequelize:migrate', function (db_name, arg, name) {
    if (arg == "create") {
      if (!name) name = (new Date).getTime();
      var opts = options(db_name);
      var dst = path.join(opts.migrationsPath, utils.ts() + '-' + db_name + '-' + name + '.js');
      grunt.file.mkdir(path.dirname(dst));
      grunt.file.copy(path.normalize(path.join(__dirname, '../assets', 'migration.tpl')), dst);
      grunt.log.writeln('Migration created: ' + path.basename(dst));

      return;
    }
    var done = this.async();
    if (!db_name) {
      var databases = grunt.config.get('sequelize.options.packages');
      var tasks = [];
      async.forEachOfSeries(databases, function (db_rep, db_name, cb) {
        run_task(db_name, arg, cb);
      }, done);
    } else {
      run_task(db_name, arg, done);
    }
  });

};
