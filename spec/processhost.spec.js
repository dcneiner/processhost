var should = require( "should" );
var _ = require( "lodash" );
var processHost = require( "../src/processHost.js" );

describe( "ProcessHost API", function() {
	describe( "when starting a child process", function() {
		var host;
		var hostEvent = false;
		var stdoutData = false;

		before( function( done ) {

			host = processHost();
			host.start( "timer1", {
				cwd: "./spec",
				command: "node",
				args: [ "timer.js" ],
				stdio: "pipe"
			} );

			// written this way to test attaching after
			// to assert that use of nextTick delays start
			// long enough for the listener to catch "started"
			host.once( "timer1.started", function() {
				hostEvent = true;
			} );

			host.once( "timer1.stdout", function() {
				stdoutData = true;
				done();
			} );
		} );

		it( "should capture started event from host", function() {
			hostEvent.should.be.true; // jshint ignore:line
		} );

		it( "should have captured stdout data", function() {
			stdoutData.should.be.true; // jshint ignore:line
		} );

		describe( "when redefining a process with 'start'", function() {
			var stdout;
			before( function( done ) {
				host.start( "timer1", {
					cwd: "./spec",
					command: "node",
					args: [ "timer2.js" ],
					stdio: "pipe"
				} ).then( function() {
					host.once( "timer1.stdout", function( line ) {
						stdout = line.data.toString();
						done();
					} );
				} );
			} );

			it( "should reflect new process", function() {
				stdout.should.equal( "It's been 100 ms.\n" );
			} );
		} );

		after( function( done ) {
			host.once( "timer1.stopped", function() {
				done();
			} );
			host.stop( "timer1" );
		} );
	} );

	describe( "when setting up multiple child process", function() {
		var host;

		before( function( done ) {
			host = processHost();
			host.setup( {
				"timer3a": {
					cwd: "./spec",
					command: "node",
					args: [ "timer.js" ],
					stdio: "pipe",
					start: true
				},
				"timer3b": {
					cwd: "./spec",
					command: "node",
					args: [ "timer.js" ],
					stdio: "pipe",
					start: true
				}, "timer3c": {
					cwd: "./spec",
					command: "node",
					args: [ "timer.js" ],
					stdio: "pipe",
					start: true
				}
			} ).then( function( handles ) {
				done();
			} );
		} );

		it( "should create all three processes", function() {
			_.keys( host.processes ).should.eql( [ "timer3a", "timer3b", "timer3c" ] );
		} );

		it( "should start all three processes", function() {
			_.all( _.values( host.processes ), function( process ) {
				return process.state === "started";
			} );
		} );

		describe( "when restarting specific process with 'start'", function() {
			var restarts = 0;
			var total = 1;
			before( function( done ) {
				host.once( "timer3b.restarting", function() {
					restarts++;
					done();
				} );
				host.start( "timer3b" );
			} );

			it( "should capture a restart for each process", function() {
				restarts.should.equal( total );
			} );

			it( "should result in all processes in started state", function() {
				_.all( _.values( host.processes ), function( process ) {
					return process.state === "started";
				} );
			} );
		} );

		describe( "when restarting multiple processes with 'restart'", function() {
			var restarts = 0;
			var total = 0;
			before( function( done ) {
				total = _.keys( host.processes ).length;
				host.on( "#.restarting", function() {
					restarts++;
					if ( restarts === total ) {
						done();
					}
				} );
				host.restart();
			} );

			it( "should capture a restart for each process", function() {
				restarts.should.equal( total );
			} );

			it( "should result in all processes in started state", function() {
				_.all( _.values( host.processes ), function( process ) {
					return process.state === "started";
				} );
			} );
		} );

		describe( "when calling start with no arguments", function() {

			it( "should throw an exception", function() {
				should.throws( function() {
					host.start();
				}, function( err ) {
						if ( err.message === "Cannot call start without an identifier." ) {
							return true;
						}
					} );
			} );
		} );

		describe( "when calling start on missing process", function() {

			it( "should throw an exception", function() {
				should.throws( function() {
					host.start( "testd" );
				}, function( err ) {
						if ( err.message === "Cannot call start on non-existent 'testd' without configuration." ) {
							return true;
						}
					} );
			} );
		} );

		after( function() {
			host.stop();
			host.removeListeners();
		} );
	} );
} );
