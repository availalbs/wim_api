/**
 * StationsController
 *
 * @module      :: Controller
 * @description	:: A set of functions called `actions`.
 *
 *                 Actions contain code telling Sails how to respond to a certain type of request.
 *                 (i.e. do stuff, then send some JSON, show an HTML page, or redirect to another URL)
 *
 *                 You can configure the blueprint URLs which trigger these actions (`config/controllers.js`)
 *                 and/or override them with custom stationss (`config/stationss.js`)
 *
 *                 NOTE: The code you write here supports both HTTP and Socket.io automatically.
 *
 * @docs        :: http://sailsjs.org/#!documentation/controllers
 */
var googleapis = require('googleapis');
var jwt = new googleapis.auth.JWT(
		'424930963222-s59k4k5usekp20guokt0e605i06psh0d@developer.gserviceaccount.com', 
		'availwim.pem', 
		'3d161a58ac3237c1a1f24fbdf6323385213f6afc', 
		['https://www.googleapis.com/auth/bigquery']
	);
jwt.authorize();	

module.exports = {    
  	
	stationsGeo:function(req,res){

		var stationsCollection = {};
		stationsCollection.type = "FeatureCollection";
		stationsCollection.features = [];

		var sql = 'SELECT station_id,state_code,ST_AsGeoJSON(the_geom) station_location FROM tmas where num_lane_1 > 0 group by station_id,state_code,ST_AsGeoJSON(the_geom);'
		Stations.query(sql,{},function(err,data){
			if (err) {res.send('{status:"error",message:"'+err+'"}',500);return console.log(err);}
				data.rows.forEach(function(stations){
					var stationsFeature = {};
					stationsFeature.type="Feature";
					stationsFeature.geometry = JSON.parse(stations.station_location);
					stationsFeature.properties = {};
					stationsFeature.properties.station_id = stations.station_id;
					stationsFeature.properties.state_code = stations.state_code;
					stationsCollection.features.push(stationsFeature);

					});

			res.send(stationsCollection);
		});
 	},
	ClassStationsGeo:function(req,res){

		var stationsCollection = {};
		stationsCollection.type = "FeatureCollection";
		stationsCollection.features = [];

		var sql = 'SELECT  station_id,state_code,ST_AsGeoJSON(the_geom) station_location FROM tmas where num_lanes1 > 0 group by station_id,state_code,ST_AsGeoJSON(the_geom);'
		Stations.query(sql,{},function(err,data){
			if (err) {res.send('{status:"error",message:"'+err+'"}',500);return console.log(err);}
				data.rows.forEach(function(stations){
					var stationsFeature = {};
					stationsFeature.type="Feature";
					stationsFeature.geometry = JSON.parse(stations.station_location);
					stationsFeature.properties = {};
					stationsFeature.properties.station_id = stations.station_id;
					stationsFeature.properties.state_code = stations.state_code;
					stationsCollection.features.push(stationsFeature);

					});

			res.send(stationsCollection);
		});
 	},
 	getAllStations:function(req,res){
 		var database = req.param('database');

 		googleapis.discover('bigquery', 'v2').execute(function(err, client) {
	    	if (err) console.log(err);
		    var request = client.bigquery.jobs.query({
		    	kind: "bigquery#queryRequest",
		    	projectId: 'avail-wim',
		    	timeoutMs: '30000'
		    });

		    var sql = 'SELECT state_fips,station_id,count(1) AS num_trucks '+
					    'FROM [tmasWIM12.'+database+'] '+
					    'WHERE state_fips IS NOT NULL '+
					    'GROUP BY state_fips,station_id '+
					    'ORDER BY state_fips,num_trucks DESC;';

		    request.body = {};
		    request.body.query = sql;
		    request.body.projectId = 'avail-wim';
	      	request.withAuthClient(jwt)
	        	.execute(function(err, response) {
	          		if (err) console.log(err);
	          		res.json(response);
	        	});
		});
 	},
 	getAllClassStations: function(req,res){
 		var database = req.param('database')+'Class';

 		googleapis.discover('bigquery', 'v2').execute(function(err, client) {
	    	if (err) console.log(err);
		    var request = client.bigquery.jobs.query({
		    	kind: "bigquery#queryRequest",
		    	projectId: 'avail-wim',
		    	timeoutMs: '30000'
		    });

		    var sql = 'SELECT state_fips,station_id,sum(total_vol) AS num_trucks '+
					    'FROM [tmasWIM12.'+database+'] '+
					    'WHERE state_fips IS NOT NULL '+
					    'GROUP BY state_fips,station_id '+
					    'ORDER BY state_fips,num_trucks DESC;';

		    request.body = {};
		    request.body.query = sql;
		    request.body.projectId = 'avail-wim';
	      	request.withAuthClient(jwt)
	        	.execute(function(err, response) {
	          		if (err) console.log(err);
	          		res.json(response);
	        	});
		});
 	},

 	getStateStations: function(req,res) {
 		if(typeof req.param('stateFips') == 'undefined'){
 			res.send('{status:"error",message:"state FIPS required"}',500);
 			return;
 		}
 		var state_fips = req.param('stateFips'),
 			database = req.param('database');

 		googleapis.discover('bigquery', 'v2').execute(function(err, client) {
	    	if (err) console.log(err);
		    var request = client.bigquery.jobs.query({
		    	kind: "bigquery#queryRequest",
		    	projectId: 'avail-wim',
		    	timeoutMs: '30000'
		    });

		    var sql = 'select station_id, year,count( distinct num_months) as numMon, '+
		    		  'count(distinct num_days) as numDay, count(distinct num_hours)/8760 as percent, '+
		    		  'sum(total)/count(distinct num_days) as AADT '+
		    		  'from (select  station_id,year,concat(string(year),string(month)) as num_months, '+
		    				  'concat(string(year),string(month),string(day)) as num_days, '+
		    				  'concat(string(year),string(month),string(day),string(hour)) as num_hours, '+
		    				  'count(station_id) as total '+
		    				  'FROM [tmasWIM12.'+database+'] '+
		    				  'where state_fips="'+state_fips+'" '+
		    				  'and state_fips is not null '+
		    				  'group by station_id,year,num_hours,num_months,num_days) '+
		    			'group by station_id,year '+
		    			'order by station_id,year';

		    request.body = {};
		    request.body.query = sql;
		    request.body.projectId = 'avail-wim';
	      	request.withAuthClient(jwt)
	        	.execute(function(err, response) {
	          		if (err) console.log(err);
	          		res.json(response);
	        	});
		});
 	},
 	getStateClassStations: function(req,res) {
 		if(typeof req.param('stateFips') == 'undefined'){
 			res.send('{status:"error",message:"state FIPS required"}',500);
 			return;
 		}
 		var state_fips = req.param('stateFips'),
 			database = req.param('database')+'Class';

 		googleapis.discover('bigquery', 'v2').execute(function(err, client) {
	    	if (err) console.log(err);
		    var request = client.bigquery.jobs.query({
		    	kind: "bigquery#queryRequest",
		    	projectId: 'avail-wim',
		    	timeoutMs: '30000'
		    });

		    var sql = 'select station_id,year,avg(DT) as ADT ,avg(passenger) as APT,'+
		    'avg(SU) as ASU ,avg(TT) as ATT from (select station_id,year,month,day,sum(total_vol) as DT,'+
		    ' sum(class1+class2+class3) as passenger, sum(class4+class5+class6+class7) as SU,'+
		    ' sum(class8+class9+class10+class11+class12+class13) as TT from [tmasWIM12.'+database+'] where '+
		    ' state_fips ="'+state_fips+'" group by state_fips,station_id,year,month,day order by station_id, '+
		    'station_id,year,month,day) group by station_id,year'
 			
		    request.body = {};
		    request.body.query = sql;
		    request.body.projectId = 'avail-wim';
	      	request.withAuthClient(jwt)
	        	.execute(function(err, response) {
	          		if (err) console.log(err);
	          		res.json(response);
	        	});
		});
 	},
 	getMonthlyInfo: function(req,res) {
 		if(typeof req.param('stateFips') == 'undefined'){
 			res.send('{status:"error",message:"state FIPS required"}',500);
 			return;
 		}
 		var state_fips = req.param('stateFips'),
 			database = req.param('database')+'Class';

 		googleapis.discover('bigquery', 'v2').execute(function(err, client) {
	    	if (err) console.log(err);
		    var request = client.bigquery.jobs.query({
		    	kind: "bigquery#queryRequest",
		    	projectId: 'avail-wim',
		    	timeoutMs: '30000'
		    });

			var sql = 'select station_id,month,avg(DT) as ADT, avg(passenger) as APT,avg(SU) as AST,avg(TT) as ATT,classCode '+
 			'from (select a.station_id,a.year,a.month,a.day,sum(a.total_vol) as DT,sum(a.class1+a.class2+a.class3) as passenger,'+
 			' sum(a.class4+a.class5+a.class6+a.class7) as SU,sum(a.class8+a.class9+a.class10+a.class11+a.class12+a.class13) as TT, '+
 			'b.func_class_code as classCode from [tmasWIM12.'+database+'] as a join '+
 			'(select station_id,func_class_code from [tmasWIM12.allStations] group by station_id, func_class_code) as b '+
 			'on a.station_id = b.station_id where a.state_fips ="'+state_fips+'" group by a.state_fips,a.station_id,a.year,a.month,a.day,'+
 			'classCode order by a.station_id, a.year,a.month,a.day) '+
			'group by station_id,month,classCode'

 			request.body = {};
		    request.body.query = sql;
		    request.body.projectId = 'avail-wim';
	      	request.withAuthClient(jwt)
	        	.execute(function(err, response) {
	          		if (err) console.log(err);
	          		res.json(response);
	        	});
		});
 	},
 	getHourlyInfo: function(req,res) {
 		if(typeof req.param('stateFips') == 'undefined'){
 			res.send('{status:"error",message:"state FIPS required"}',500);
 			return;
 		}
 		var state_fips = req.param('stateFips'),
 			database = req.param('database')+'Class';

 		googleapis.discover('bigquery', 'v2').execute(function(err, client) {
	    	if (err) console.log(err);
		    var request = client.bigquery.jobs.query({
		    	kind: "bigquery#queryRequest",
		    	projectId: 'avail-wim',
		    	timeoutMs: '30000'
		    });

			var sql = 'select station_id,hour,avg(DT) as ADT, avg(passenger) as APT,avg(SU) as AST,avg(TT) as ATT,classCode '+
 			'from (select a.station_id,a.year,a.month,a.day,sum(a.total_vol) as DT,sum(a.class1+a.class2+a.class3) as passenger,'+
 			' sum(a.class4+a.class5+a.class6+a.class7) as SU,sum(a.class8+a.class9+a.class10+a.class11+a.class12+a.class13) as TT, '+
 			'b.func_class_code as classCode,a.hour from [tmasWIM12.'+database+'] as a join '+
 			'(select station_id,func_class_code from [tmasWIM12.allStations] group by station_id, func_class_code) as b '+
 			'on a.station_id = b.station_id where a.state_fips ="'+state_fips+'" group by a.state_fips,a.station_id,a.year,a.month,a.day,'+
 			'classCode,a.hour) '+
			'group by station_id,hour,classCode'
			console.log(sql)
		    request.body = {};
		    request.body.query = sql;
		    request.body.projectId = 'avail-wim';
	      	request.withAuthClient(jwt)
	        	.execute(function(err, response) {
	          		if (err) console.log(err);
	          		res.json(response);
	        	});
		});
 	},
 	getStateWeightStations: function(req,res) {
 		if(typeof req.param('stateFips') == 'undefined'){
 			res.send('{status:"error",message:"state FIPS required"}',500);
 			return;
 		}
 		if(typeof req.param('class') == 'undefined'){
 			res.send('{status:"error",message:"vehicle class required"}',500);
 			return;
 		}
 		var state_fips = req.param('stateFips'),
 			database = req.param('database');

 		googleapis.discover('bigquery', 'v2').execute(function(err, client) {
	    	if (err) console.log(err);
		    var request = client.bigquery.jobs.query({
		    	kind: "bigquery#queryRequest",
		    	projectId: 'avail-wim',
		    	timeoutMs: '30000'
		    });

		    var sql = 'select station_id,year,count(distinct num_hours) as hours,'+
		    		  'sum(weight) as weight from (select station_id,year, month,day,'+
		    		  'concat(string(year),string(month),string(day),string(hour)) as num_hours,'+
		    		  'sum(total_weight) as weight FROM [tmasWIM12.'+database+'] where state_fips="'+state_fips+'"'+
		    		  'and class='+req.param('class')+' group each by station_id,year,month,day,num_hours order by station_id,'+
		    		  'year,month,day,num_hours) group by station_id,year'
 			request.body = {};
		    request.body.query = sql;
		    request.body.projectId = 'avail-wim';
	      	request.withAuthClient(jwt)
	        	.execute(function(err, response) {
	          		if (err) console.log(err);
	          		res.json(response);
	        	});
		});
 	},
 	getStateOverweightStations: function(req,res) {
 		if(typeof req.param('stateFips') == 'undefined'){
 			res.send('{status:"error",message:"state FIPS required"}',500);
 			return;
 		}
 		if(typeof req.param('timeType') == 'undefined'){
 			res.send('{status:"error",message:"vehicle class required"}',500);
 			return;
 		}
 		if(typeof req.param('threshold') == 'undefined'){
 			res.send('{status:"error",message:"vehicle class required"}',500);
 			return;
 		}
 		if(typeof req.param('queryType') == 'undefined'){
 			res.send('{status:"error",message:"vehicle class required"}',500);
 			return;
 		}
 		var state_fips = req.param('stateFips'),
 			database = req.param('database'),
 			timeType = req.param('timeType'),
 			threshold = req.param('threshold'),
 			queryType = req.param('queryType');


 		googleapis.discover('bigquery', 'v2').execute(function(err, client) {
	    	if (err) console.log(err);
		    var request = client.bigquery.jobs.query({
		    	kind: "bigquery#queryRequest",
		    	projectId: 'avail-wim',
		    	timeoutMs: '30000'
		    });
		    if(queryType === "on"){
		    	var sql = 'select a.station_id, SUM(CASE WHEN a.total_weight*220.462 >= '+threshold+' THEN 1 ELSE 0 END) as overTrucks,count(1) as total_trucks,a.month,b.func_class_code from [tmasWIM12.'+database+'] as a join (select station_id,func_class_code from [tmasWIM12.allStations] group by station_id, func_class_code) as b on a.station_id = b.station_id where a.state_fips="'+state_fips+'"'+
		    	'and (a.class=8 or a.class=9 or a.class=10 or a.class=11 or a.class=12 or a.class=13) '+
		    	'group by a.station_id,a.month,a.year,b.func_class_code order by a.station_id,a.month,a.year,b.func_class_code'
		    }
		    else if(timeType === "year"){
			    var sql = 'select station_id, SUM(CASE WHEN total_weight*220.462 >= '+threshold+' THEN 1 ELSE 0 END) as overTrucks,count(1) as totalTrucks,year from [tmasWIM12.'+database+'] where state_fips="'+state_fips+'"'+
			    		  'and (class=8 or class=9 or class=10 or class=11 or class=12 or class=13) '+ 
			    		  'group by station_id,year order by station_id,year'
			   		}
	   		else if(timeType === "month"){
	   			var sql = 'select station_id, SUM(CASE WHEN total_weight*220.462 >= '+threshold+' THEN 1 ELSE 0 END) as overTrucks,count(1) as totalTrucks,month from [tmasWIM12.'+database+'] where state_fips="'+state_fips+'"'+
		    		  'and (class=8 or class=9 or class=10 or class=11 or class=12 or class=13) '+ 
		    		  'group by station_id,year,month order by station_id,year,month'
	   		}
	   		else if(timeType === "day"){
	   			var sql = 'select station_id, SUM(CASE WHEN total_weight*220.462 >= '+threshold+' THEN 1 ELSE 0 END) as overTrucks,count(1) as totalTrucks,day from [tmasWIM12.'+database+'] where state_fips="'+state_fips+'"'+
		    		  'and (class=8 or class=9 or class=10 or class=11 or class=12 or class=13) '+ 
		    		  'group by station_id,year,month,day order by station_id,year,month,day'
	   		}
	   		request.body = {};
		    request.body.query = sql;
		    request.body.projectId = 'avail-wim';
	      	request.withAuthClient(jwt)
	        	.execute(function(err, response) {
	          		if (err) console.log(err);
	          		res.json(response);
	        	});
		});
 	},
 	getStationGeoForState: function(req, res) {
 		if(typeof req.param('statefips') == 'undefined'){
 			res.send('{status:"error",message:"state FIPS required"}',500);
 			return;
 		}
 		var stateFIPS = +req.param('statefips');

 		googleapis.discover('bigquery', 'v2').execute(function(err, client) {
	    	if (err) {
	    		console.log(err);
	    		return;
	    	}
 		
			var featureCollection = {
				type: "FeatureCollection",
				features: []
			}

			var sql = "SELECT station_id,func_class_code,method_of_vehicle_class,"+
				"method_of_truck_weighing,type_of_sensor,latitude,longitude "+
				"FROM [tmasWIM12.allStations] "+
				"WHERE NOT latitude = '        ' AND NOT latitude = '       0'"+
				"AND state_fips = '" +stateFIPS+ "' "+
				"GROUP BY station_id,func_class_code,method_of_vehicle_class,"+
				"method_of_truck_weighing,type_of_sensor,latitude,longitude;";

		    var request = client.bigquery.jobs.query({
		    	kind: "bigquery#queryRequest",
		    	projectId: 'avail-wim',
		    	timeoutMs: '30000'
		    });
		    request.body = {};
		    request.body.query = sql;
		    request.body.projectId = 'avail-wim';
	      	request.withAuthClient(jwt)
	        	.execute(function(err, BQobj) {
			    	if (err) {
			    		console.log(err);
			    		return;
			    	}
			    	if (!('rows' in BQobj)) {
			    		res.json(featureCollection);
			    		return;
			    	}

			    	var schema = [];
			    	BQobj.schema.fields.forEach(function(d) {
			    		schema.push(d.name);
			    	})

			    	BQobj.rows.forEach(function(d) {
			    		var feature = {
			    			type:'Feature',
			    			geometry: {
			    				type:'Point',
			    				coordinates: [0, 0]
			    			},
			    			properties: {}
			    		};
			    		schema.forEach(function(name, i) {
			    			if (name != 'latitude' && name != 'longitude') {
				    			feature.properties[name] = d.f[i].v;
				    		} else if (name == 'longitude') {
				    			var lng = (+d.f[i].v).toString();
				    			if (/^1/.test(lng)) {
				    				lng = lng.replace(/^(1\d\d)/, '-$1.');
				    			} else {
				    				lng = lng.replace(/^(\d\d)/, '-$1.');
				    			}

				    			feature.geometry.coordinates[0] = lng;
				    		} else if (name == 'latitude') {
				    			var lat = (+d.f[i].v).toString().replace(/^ ?(\d\d)/, '$1.');
				    			feature.geometry.coordinates[1] = lat;
				    		}
			    		})
			    		featureCollection.features.push(feature);
			    	})

	          		res.json(featureCollection);
	        	});
		});
 	},
 	getClassStationData: function(req, res) {
 		if(typeof req.param('station_id') == 'undefined'){
 			res.send('{status:"error",message:"station_id required"}',500);
 			return;
 		}
 		var station_id = req.param('station_id'),
 			depth = req.param('depth'),
 			database = req.param('database')+'Class';

 		var select = {
 			1: 'year',
 			2: 'month',
 			3: 'day',
 			4: 'hour'
 		};

 		var SQL = generateSQL();

 		googleapis.discover('bigquery', 'v2').execute(function(err, client) {
	    	if (err) console.log(err);
		    var request = client.bigquery.jobs.query({
		    	kind: "bigquery#queryRequest",
		    	projectId: 'avail-wim',
		    	timeoutMs: '30000'
		    });
		    request.body = {};
		    request.body.query = SQL;
		    request.body.projectId = 'avail-wim';
	      	request.withAuthClient(jwt)
	        	.execute(function(err, response) {
	          		if (err) console.log(err);
	          		res.json(response);
	        	});
		});

		function generateSQL() {
 			var sql	= "SELECT " + select[depth.length] + ", sum(total_vol) AS amount, "
 				+ addClasses()
 				+ "FROM [tmasWIM12."+database+"] "
 				+ "WHERE station_id = '"+station_id+"' "
 				+ addPredicates()
 				+ "GROUP BY " + select[depth.length] + " "
 				+ "ORDER BY " + select[depth.length] + ";";

			return sql;
		}
		function addClasses() {
			var classes = '';

			for (var i = 1; i < 14; i++) {
				classes += 'sum(class'+i+') AS class'+i+', '
			}
			return classes;
		}
 		function addPredicates() {
 			var preds = '';
 			for (var i = 1; i < depth.length; i++) {
 				preds += 'AND ' + select[i] + ' = ' + depth[i] + ' ';
 			}
 			return preds;
 		}
 	},
 	getStationData:function(req,res){
 		if(typeof req.param('station_id') == 'undefined'){
 			res.send('{status:"error",message:"station_id required"}',500);
 			return;
 		}
 		var station_id = req.param('station_id'),
 			depth = req.param('depth'),
 			database = req.param('database');

 		var select = {
 			1: 'year',
 			2: 'month',
 			3: 'day',
 			4: 'hour'
 		};

 		var SQL = generateSQL();

 		googleapis.discover('bigquery', 'v2').execute(function(err, client) {
		    	if (err) {
		    		console.log(err);
		    		return;
		    	}

			    var request = client.bigquery.jobs.query({
			    	kind: "bigquery#queryRequest",
			    	projectId: 'avail-wim',
			    	timeoutMs: '30000'
			    });

			    request.body = {};
			    request.body.query = SQL;
			    request.body.projectId = 'avail-wim';
		      	request.withAuthClient(jwt)
	        	.execute(function(err, response) {
	          		if (err) {
	          			console.log(err);
	          			return;
	          		}
	          		res.json(response);
	        	});
		});
 		function generateSQL() {
 			var sql	= "SELECT " + select[depth.length] + ", class, total_weight AS weight, count(*) AS amount "
 				+ "FROM [tmasWIM12."+database+"] "
 				+ "WHERE station_id = '"+station_id+"' "
 				+ addPredicates()
 				+ "GROUP BY " + select[depth.length] + ", class, weight "
 				+ "ORDER BY " + select[depth.length] + ";";
 			return sql;
 		}
 		function addPredicates() {
 			var preds = '';
 			for (var i = 1; i < depth.length; i++) {
 				preds += 'AND ' + select[i] + ' = ' + depth[i] + ' ';
 			}
 			return preds;
 		}
	},
 	getTrucks:function(req,res){
 		var station_id = req.param('stationId'),
 			database = req.param('database');
 		//console.time('auth');
 		googleapis.discover('bigquery', 'v2').execute(function(err, client) {
		    //jwt.authorize(function(err, result) {
		    	if (err) console.log(err);
			    var request = client.bigquery.jobs.query({
			    	kind: "bigquery#queryRequest",
			    	projectId: 'avail-wim',
			    	timeoutMs: '30000'
			    });
			    //console.timeEnd('auth');
			    request.body = {};
			    request.body.query = 'select num_days,count(num_days) as numDay,month,day,class,year,sum(total_weight) from(select station_id,class,concat(string(year),string(month),string(day)) as num_days, month,day,year,total_weight FROM [tmasWIM12.'+database+'] where station_id="'+station_id+'" and station_id is not null) group by num_days,month,day,class,year';
			    request.body.projectId = 'avail-wim';
			    //console.log(request.body.query);
			    console.time('query');
		      	request.withAuthClient(jwt)
	        	.execute(function(err, response) {
	          		if (err) console.log(err);
	          		//console.log(response);
	          		//console.timeEnd('query');
	          		//console.time('send');
	          		res.json(response);
	          		//console.timeEnd('send');
	        	});
		    //});
		});
 	},
 	getYears:function(req,res){
 		var database = req.param('database');
 		googleapis.discover('bigquery', 'v2').execute(function(err, client) {
		    jwt.authorize(function(err, result) {
		    	if (err) console.log(err);
		    	//console.log()
			    var request = client.bigquery.jobs.query({
			    	kind: "bigquery#queryRequest",
			    	projectId: 'avail-wim',
			    	timeoutMs: '30000'
			    });
			    request.body = {};
			    request.body.query = 'Select min(year),max(year) from [tmasWIM12.'+database+']';
			    request.body.projectId = 'avail-wim';
			    //console.log(request);
		      	request.withAuthClient(jwt)
	        	.execute(function(err, response) {
	          		if (err) console.log(err);
	          		//console.log(response);
	          		res.json(response);
	        	});
		    });
		});
 	},
 	getClass:function(req,res){
 		var database = req.param('database'),
 		station_id = req.param('stationId');
 		googleapis.discover('bigquery', 'v2').execute(function(err, client) {
		    jwt.authorize(function(err, result) {
		    	if (err) console.log(err);
		    	//console.log()
			    var request = client.bigquery.jobs.query({
			    	kind: "bigquery#queryRequest",
			    	projectId: 'avail-wim',
			    	timeoutMs: '30000'
			    });
			    request.body = {};
			    request.body.query = 'SELECT year, month, day, sum(class1), sum(class2), sum(class3), sum(class4), sum(class5), sum(class6), sum(class7), sum(class8), sum(class9), sum(class10), sum(class11), sum(class12), sum(class13),FROM [tmasWIM12.'+database+'Class] where station_id="'+station_id+'" group by year, month, day';
			    request.body.projectId = 'avail-wim';
			    //console.log(request);
		      	request.withAuthClient(jwt)
	        	.execute(function(err, response) {
	          		if (err) console.log(err);
	          		//console.log(response);
	          		res.json(response);
	        	});
		    });
		});
 	},
	getStationInfo:function(req,res){
 		var database = req.param('database'),
 		station_id = req.param('stationId');
 		googleapis.discover('bigquery', 'v2').execute(function(err, client) {
		    jwt.authorize(function(err, result) {
		    	if (err) console.log(err);
		    	//console.log()
			    var request = client.bigquery.jobs.query({
			    	kind: "bigquery#queryRequest",
			    	projectId: 'avail-wim',
			    	timeoutMs: '30000'
			    });
			    request.body = {};
			    request.body.query = 'select func_class_code, num_lanes_direc_indicated, sample_type_for_traffic_vol, method_of_traffic_vol_counting, alg_for_vehicle_class, class_sys_for_vehicle_class, method_of_truck_weighing, calibration_of_weighing_sys, type_of_sensor, second_type_of_sensor, primary_purpose, year_station_established, fips_county_code, concurrent_route_signing, concurrent_signed_route_num, national_highway_sys, posted_sign_route_num, station_location,latitude, longitude,  from [tmasWIM12.allStations] where station_id="'+station_id+'" limit 1';
			    request.body.projectId = 'avail-wim';
			    //console.log(request);
		      	request.withAuthClient(jwt)
	        	.execute(function(err, response) {
	          		if (err) console.log(err);
	          		//console.log(response);
	          		res.json(response);
	        	});
		    });
		});
 	}, 	


  /**
   * Overrides for the settings in `config/controllers.js`
   * (specific to StationsController)
   */
  _config: {}

  
};
