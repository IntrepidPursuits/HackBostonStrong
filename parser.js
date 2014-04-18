var xhrgoform = require('xhrgoform');
var querystring = require('querystring');
var http = require('http');
var request = require('request');
var jsdom = require('jsdom');
var fs = require('fs');

var baseLink2013 = "http://registration.baa.org/cfm_Archive/iframe_ArchiveSearch.cfm?mode=results&criteria=&StoredProcParamsOn=yes&VarAgeLowID=0&VarAgeHighID=0&VarGenderID=0&VarBibNumber=&VarLastName=&VarFirstName=&VarStateID=0&VarCountryOfResidenceID=0&VarCity=&VarZip=&VarTimeLowHr=&VarTimeLowMin=&VarTimeLowSec=00&VarTimeHighHr=&VarTimeHighMin=&VarTimeHighSec=59&VarSortOrder=ByName&VarAddInactiveYears=0&records=25&headerexists=Yes&bordersize=0&bordercolor=%23ffffff&rowcolorone=%23FFCC33&rowcolortwo=%23FFCC33&headercolor=%23ffffff&headerfontface=Verdana%2CArial%2CHelvetica%2Csans%2Dserif&headerfontcolor=%23004080&headerfontsize=12px&fontface=Verdana%2CArial%2CHelvetica%2Csans%2Dserif&fontcolor=%23000099&fontsize=10px&linkfield=&linkurl=&linkparams=&queryname=SearchResults&tablefields=RaceYear%2CFullBibNumber%2CFormattedSortName%2CAgeOnRaceDay%2CGenderCode%2CCity%2CStateAbbrev%2CCountryOfResAbbrev%2CReportingSegment&VarRaceYearLowID=2013&VarRaceYearHighID=0";

function run(){
	function callback (arg) {
		console.log("Yay");
		console.log(arg);
	};
	function error (err) {
		console.log("Oops");
		console.log(err);
	}
	//runAllYearsSafe(error, callback); // Not recommended - eats your brains (memory)
    //runYearsSafe(error, callback, ['2001']); // One at a time - spits out a file every 1000 runners
	//stitchYearTogether('2001'); // Which must be stitched together
	//cleanYear('2001'); // And then cleaned, because I messed up
	//cleanAllYears(); // Or all cleaned at once
	stitchAllYearsTogether(pretty=true); // Stick 'em togther into one big file
}
run();

var YEARS = ['2001', '2002', '2003', '2004', '2005', '2006', '2007', '2008', '2009', '2010', '2011', '2012', '2013'];

function fetchRunnersFromPage(error, callback, url, start, year) {
	var options = {
		'url': url,
		'form': {
			'start':start,
			'next':'Next 25 Records'
		},
		'headers': {
			'User-Agent':"Rested/2009 CFNetwork/673.2.1 Darwin/13.1.0 (x86_64) (MacBookPro11%2C2)"
		}
	}
	request.post(
		options, 
		function (err, httpResponse, body) {
			if (body == null) {
				callback([]);
			}
			jsdom.env(
				{
					html: body,
					scripts: [
						'http://code.jquery.com/jquery-1.5.min.js'
					],
					done: function (err, window) {
						var $ = window.jQuery;

						var runners = [];
						var lastRunnerWithHeader;

						$($($('.tablegrid_table')[0]).find('tbody')[0]).find('tr').each(function(trIndex, row) {
							var c = $(row).attr('class');
							if (c === 'tr_header') {
								var runner = parseRunnerHeader($, row);
								lastRunnerWithHeader = runner;
								//console.log(runner);
							} else {
								var runner = parseRunnerBody($, row, lastRunnerWithHeader);
								if (runner) {
									runner.year = year;
									runners.push(runner);	
								}
							}
						});	

						callback(runners);
					}
				}
			);
		}
	);
}

function runYear(error, callback, year) {
	var url = "http://registration.baa.org/cfm_Archive/iframe_ArchiveSearch.cfm?mode=results&criteria=&StoredProcParamsOn=yes&VarAgeLowID=0&VarAgeHighID=0&VarGenderID=0&VarBibNumber=&VarLastName=&VarFirstName=&VarStateID=0&VarCountryOfResidenceID=0&VarCity=&VarZip=&VarTimeLowHr=&VarTimeLowMin=&VarTimeLowSec=00&VarTimeHighHr=&VarTimeHighMin=&VarTimeHighSec=59&VarSortOrder=ByName&VarAddInactiveYears=0&records=25&headerexists=Yes&bordersize=0&bordercolor=%23ffffff&rowcolorone=%23FFCC33&rowcolortwo=%23FFCC33&headercolor=%23ffffff&headerfontface=Verdana%2CArial%2CHelvetica%2Csans%2Dserif&headerfontcolor=%23004080&headerfontsize=12px&fontface=Verdana%2CArial%2CHelvetica%2Csans%2Dserif&fontcolor=%23000099&fontsize=10px&linkfield=&linkurl=&linkparams=&queryname=SearchResults&tablefields=RaceYear%2CFullBibNumber%2CFormattedSortName%2CAgeOnRaceDay%2CGenderCode%2CCity%2CStateAbbrev%2CCountryOfResAbbrev%2CReportingSegment&VarRaceYearLowID=" + year + "&VarRaceYearHighID=0";
	var start = 1;
	var yearsRunners = [];
	
	runYearRecursive(
		error,
		callback,
		url,
		start,
		year
	);
}

function runYearRecursive(error, callback, url, start, year) {
	fetchRunnersFromPage(
		function (err) {
			console.log(err);
			error(err);
		},
		function (pagesRunners) {
			if (pagesRunners.length < 25) {
				// We're on the last page
				callback(pagesRunners);
			} else {
				// Go get the next page
				console.log(pagesRunners.length + " runners from start: " + start);
				runYearRecursive(
					error,
					function (recursiveRunners) {
						// add the next page's list onto the end of ours
						var runners = pagesRunners.concat(recursiveRunners);
						callback(runners);
					},
					url,
					start + 25,
					year
				);
			}
		},
		url,
		start,
		year
	);
}

function runYearSafe(error, callback, year) {
	var url = "http://registration.baa.org/cfm_Archive/iframe_ArchiveSearch.cfm?mode=results&criteria=&StoredProcParamsOn=yes&VarAgeLowID=0&VarAgeHighID=0&VarGenderID=0&VarBibNumber=&VarLastName=&VarFirstName=&VarStateID=0&VarCountryOfResidenceID=0&VarCity=&VarZip=&VarTimeLowHr=&VarTimeLowMin=&VarTimeLowSec=00&VarTimeHighHr=&VarTimeHighMin=&VarTimeHighSec=59&VarSortOrder=ByName&VarAddInactiveYears=0&records=25&headerexists=Yes&bordersize=0&bordercolor=%23ffffff&rowcolorone=%23FFCC33&rowcolortwo=%23FFCC33&headercolor=%23ffffff&headerfontface=Verdana%2CArial%2CHelvetica%2Csans%2Dserif&headerfontcolor=%23004080&headerfontsize=12px&fontface=Verdana%2CArial%2CHelvetica%2Csans%2Dserif&fontcolor=%23000099&fontsize=10px&linkfield=&linkurl=&linkparams=&queryname=SearchResults&tablefields=RaceYear%2CFullBibNumber%2CFormattedSortName%2CAgeOnRaceDay%2CGenderCode%2CCity%2CStateAbbrev%2CCountryOfResAbbrev%2CReportingSegment&VarRaceYearLowID=" + year + "&VarRaceYearHighID=0";
	var start = 1;
	//var start = 21001;
	var yearsRunners = [];

	var outputFileNumber = 1;
	//var outputFileNumber = 22;

	function save () {
		saveRunners(yearsRunners, 'marathonResults' + year + '-' + outputFileNumber + '.json');
		outputFileNumber += 1;
		yearsRunners = [];
	}

	function doNext (runners) {
		yearsRunners = yearsRunners.concat(runners);
		if (runners.length < 25) {
			// We're on the last page
			save();
			callback();
		} else {
			// See if we should save
			if (yearsRunners.length == 1000) {
				save();
			}
			// Go get the next page
			start += 25;
			runYearSubproblem (
				error, 
				doNext, 
				url, 
				start, 
				year
			);
		}
	}

	runYearSubproblem (
		error, 
		doNext, 
		url, 
		start, 
		year
	);
}

function runYearSubproblem(error, callback, url, start, year) {
	fetchRunnersFromPage(
		function (err) {
			console.log(err);
			error(err);
		},
		function (pagesRunners) {
			console.log(pagesRunners.length + " runners from subproblem start: " + start);
			callback(pagesRunners);
		},
		url,
		start,
		year
	);
}

function runAllYears(error, callback) {
	var currentYearIndex = 0;
	var years = ['2001', '2002', '2003', '2004', '2005', '2006', '2007', '2008', '2009', '2010', '2011', '2012', '2013']

	var runners = [];

	function handleError (err) {
		currentYearIndex += 1;
	}
	function doNext() {
		if (currentYearIndex >= years.length) {
			console.log("Done");
			callback(runners);
			return;
		}
		runYear(
			handleError,
			function (runners) {
				var thatYear = years[currentYearIndex];
				console.log("### " + runners.length + " runners in year " + thatYear);
				currentYearIndex += 1;
				saveRunners(runners, 'marathonResults' + thatYear + '.json')
				doNext();
			},
			years[currentYearIndex]
		);
	}

	doNext();
}

function runYearsSafe(error, callback, years) {
	var currentYearIndex = 0;

	var runners = [];

	function handleError (err) {
		currentYearIndex += 1;
	}
	function doNext() {
		if (currentYearIndex >= years.length) {
			console.log("Done");
			callback(runners);
			return;
		}
		runYearSafe(
			handleError,
			function () {
				currentYearIndex += 1;
				doNext();
			},
			years[currentYearIndex]
		);
	}

	doNext();
}

function runAllYearsSafe(error, callback) {
	runYearsSafe(error, callback, YEARS);
}

function saveRunners(runners, outputFilename, indent) {
	if (indent == undefined) {
		indent = 4;
	}
	console.log("Saving to " + outputFilename + "...");
	try {
		fs.writeFile(
			outputFilename, 
			JSON.stringify(runners, null, indent), 
			function(err) {
		    	if(err) {
		    		console.log(err);
		    	} else {
		    		console.log("JSON saved to " + outputFilename + " with " + runners.length + " runners");
		    	}
			}
		); 
	} catch (e) {
		console.log("ooops");
		console.log("got in catch loop for " + outputFilename);
		console.log(e);
	}
}

function loadRunnersFromFile (fileName) {
	console.log("loading from " + fileName + "...");
	var runners = JSON.parse(fs.readFileSync(fileName, 'utf8'));
	console.log("Loaded " + runners.length + " runners from " + fileName);
	return runners;
}

function loadRunnersFromYear (year) {
	var fileName = 'marathonResults' + year + '.json';
	var runners = loadRunnersFromFile(fileName);
	return runners;
}

function stitchYearTogether (year) {
	fileNamesArray = fs.readdirSync('./');
	fileNames = {};
	for (var i = fileNamesArray.length - 1; i >= 0; i--) {
		fileNames[fileNamesArray[i]] = true;
	};

	var runners = [];

	var outputFileNumber = 1;
	while (true) {
		var nextName = 'marathonResults' + year + '-' + outputFileNumber + '.json';
		console.log(nextName);
		if (nextName in fileNames) {
			var obj = loadRunnersFromFile(nextName);
			runners = runners.concat(obj);
			outputFileNumber += 1;
		} else {
			break;
		}
	}

	var outputFilename = 'marathonResults' + year + '.json';
	saveRunners(runners, outputFilename);
}

function stitchAllYearsTogether (pretty) {
	var years = ['2001', '2002', '2003', '2004', '2005', '2006', '2007', '2008', '2009', '2010', '2011', '2012', '2013'];
	var runners = [];

	for (var i = 0; i < years.length; i++) {
		var year = years[i];
		var nextName = 'marathonResults' + year + "+clean.json";
		var theseRunners = loadRunnersFromFile(nextName);
		runners = runners.concat(theseRunners);
	};

	var outputFilename = 'marathonResults.json';
	var indent;
	if (pretty) {
		indent = 4;
		outputFilename = 'marathonResults+pretty.json';
	} else {
		indent = 0;
	}
	saveRunners(runners, outputFilename, indent);
}

function cleanAllYears() {
	var years = ['2001', '2002', '2003', '2004', '2005', '2006', '2007', '2008', '2009', '2010', '2011', '2012', '2013'];
	for (var i = 0; i < years.length; i++) {
		var year = years[i];
		cleanYear(year);
	};
}

function cleanYear (year) {
	var runners = loadRunnersFromYear(year);
	cleanRunners(runners);
	saveRunners(runners, 'marathonResults' + year + "+clean.json");
}

function cleanRunners (runners) {
	for (var i = runners.length - 1; i >= 0; i--) {
		cleanRunner(runners[i]);
	};
}

// "overallPlace": "8566     / 22672",
// "genderPlace": "6661     / 13120",
// "divisionPlace": "237      / 1118", 
function cleanRunner (runner) {
	splitOnSlashMakeIntsAndSaveIntoObjectAtKeys( runner.overallPlace, runner, "overallPlace", "overallTotal" );
	splitOnSlashMakeIntsAndSaveIntoObjectAtKeys( runner.genderPlace, runner, "genderPlace", "genderTotal" );
	splitOnSlashMakeIntsAndSaveIntoObjectAtKeys( runner.divisionPlace, runner, "divisionPlace", "divisionTotal" );
}

function splitOnSlashMakeIntsAndSaveIntoObjectAtKeys (value, object, numeratorKey, denominatorKey) {
	parts = value.replace(/ /g,'').split('/');
	var numerator, denominator;
	if (parts.length != 2) {
		console.log("oh crap: " + value + " of " + numeratorKey + " and " + denominatorKey + " on " + JSON.stringify(object));
		numerator = null;
		denominator = null;
	}
	else {
		numerator = parseInt(parts[0]);
		denominator = parseInt(parts[1]);
	}
	object[numeratorKey] = numerator;
	object[denominatorKey] = denominator;
	return object;
}

var headerColumns = ["year","bib","name","age","gender","city","state","country"];
function parseRunnerHeader($, headerRow) {
	var runner = {};
	$(headerRow).find('td').each(
		function (index, cell) {
			if (index >= headerColumns.length) return;
			var property = headerColumns[index];
			var value = trim(cell.innerHTML);
			runner[property] = value;
		}
	);
	return runner;
}

var bodyColumns = ["overallPlace","genderPlace","divisionPlace","officialTime","netTime"];
function parseRunnerBody($, bodyRow, runner) {
	var isActualData = false;
	$($(bodyRow).find('tr')[1]).find('td').each(
		function (index, cell) {
			if (index >= bodyColumns.length) return;
			var property = bodyColumns[index];
			var value = trim(cell.innerHTML);
			runner[property] = value;
			isActualData = true;
		}
	);
	if (!isActualData) {
		return null;
	} else {
		return runner;
	}
}

function trim(string) {
	result = string.trim();
	if (result === "&nbsp;") return null;
	return result;
}