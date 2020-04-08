/* global module */

var NodeHelper = require('node_helper')
var request = require('request')

var usStats = 'https://covidtracking.com/api/states'
var usStatsDaily = 'https://covidtracking.com/api/states/daily'
var countyStats = 'https://coronavirus-tracker-api.herokuapp.com/v2/locations?source=csbs&country_code=US&province=Nevada'
var newcountyStats = 'https://coronadatascraper.com/data.json'
var msbi = 'https://wabi-us-gov-iowa-api.analysis.usgovcloudapi.net/public/reports/querydata?synchronous=true'
var msbi_ppcases = {"version":"1.0.0","queries":[{"Query":{"Commands":[{"SemanticQueryDataShapeCommand":{"Query":{"Version":2,"From":[{"Name":"s","Entity":"Sheet1"}],"Select":[{"Aggregation":{"Expression":{"Column":{"Expression":{"SourceRef":{"Source":"s"}},"Property":"Positive"}},"Function":0},"Name":"Sum(Sheet1.Positive)"}],"Where":[{"Condition":{"In":{"Expressions":[{"Column":{"Expression":{"SourceRef":{"Source":"s"}},"Property":"RESULT"}}],"Values":[[{"Literal":{"Value":"'Total'"}}]]}}}]},"Binding":{"Primary":{"Groupings":[{"Projections":[0]}]},"DataReduction":{"DataVolume":3,"Primary":{"Top":{}}},"Version":1}}}]},"CacheKey":"{\"Commands\":[{\"SemanticQueryDataShapeCommand\":{\"Query\":{\"Version\":2,\"From\":[{\"Name\":\"s\",\"Entity\":\"Sheet1\"}],\"Select\":[{\"Aggregation\":{\"Expression\":{\"Column\":{\"Expression\":{\"SourceRef\":{\"Source\":\"s\"}},\"Property\":\"Positive\"}},\"Function\":0},\"Name\":\"Sum(Sheet1.Positive)\"}],\"Where\":[{\"Condition\":{\"In\":{\"Expressions\":[{\"Column\":{\"Expression\":{\"SourceRef\":{\"Source\":\"s\"}},\"Property\":\"RESULT\"}}],\"Values\":[[{\"Literal\":{\"Value\":\"'Total'\"}}]]}}}]},\"Binding\":{\"Primary\":{\"Groupings\":[{\"Projections\":[0]}]},\"DataReduction\":{\"DataVolume\":3,\"Primary\":{\"Top\":{}}},\"Version\":1}}}]}","QueryId":"","ApplicationContext":{"DatasetId":"23b35406-eaa1-4c4c-9270-c9c5978432c6","Sources":[{"ReportId":"18636c78-00fa-41b0-8364-136fc9a8041e"}]}}],"cancelQueries":[],"modelId":272235}
var msbi_ppdeaths = {"version":"1.0.0","queries":[{"Query":{"Commands":[{"SemanticQueryDataShapeCommand":{"Query":{"Version":2,"From":[{"Name":"d","Entity":"Deaths"},{"Name":"s","Entity":"Sheet1"}],"Select":[{"Aggregation":{"Expression":{"Column":{"Expression":{"SourceRef":{"Source":"d"}},"Property":"Count"}},"Function":0},"Name":"Sum(Deaths.Count)"}],"Where":[{"Condition":{"In":{"Expressions":[{"Column":{"Expression":{"SourceRef":{"Source":"s"}},"Property":"RESULT"}}],"Values":[[{"Literal":{"Value":"'Total'"}}]]}}}]},"Binding":{"Primary":{"Groupings":[{"Projections":[0]}]},"DataReduction":{"DataVolume":3,"Primary":{"Top":{}}},"Version":1}}}]},"CacheKey":"{\"Commands\":[{\"SemanticQueryDataShapeCommand\":{\"Query\":{\"Version\":2,\"From\":[{\"Name\":\"d\",\"Entity\":\"Deaths\"},{\"Name\":\"s\",\"Entity\":\"Sheet1\"}],\"Select\":[{\"Aggregation\":{\"Expression\":{\"Column\":{\"Expression\":{\"SourceRef\":{\"Source\":\"d\"}},\"Property\":\"Count\"}},\"Function\":0},\"Name\":\"Sum(Deaths.Count)\"}],\"Where\":[{\"Condition\":{\"In\":{\"Expressions\":[{\"Column\":{\"Expression\":{\"SourceRef\":{\"Source\":\"s\"}},\"Property\":\"RESULT\"}}],\"Values\":[[{\"Literal\":{\"Value\":\"'Total'\"}}]]}}}]},\"Binding\":{\"Primary\":{\"Groupings\":[{\"Projections\":[0]}]},\"DataReduction\":{\"DataVolume\":3,\"Primary\":{\"Top\":{}}},\"Version\":1}}}]}","QueryId":"","ApplicationContext":{"DatasetId":"23b35406-eaa1-4c4c-9270-c9c5978432c6","Sources":[{"ReportId":"18636c78-00fa-41b0-8364-136fc9a8041e"}]}}],"cancelQueries":[],"modelId":272235}

module.exports = NodeHelper.create({
  start: function () {
    console.log('Starting node helper for: ' + this.name)
  },
  getNVStatDeaths: function(payload) {
    var self = this
    var options = {
      method: 'POST',
      headers: {'content-type': 'application/json' },
      url: msbi,
      body: JSON.stringify(msbi_ppdeaths),
      gzip: true
    }
    request(options, function (error, response, body) {
      if (!error && response.statusCode == 200) {
        console.log('getNVStatCases',body)
        var result = JSON.parse(body)
        var cases = result.results[0].result.data.dsr.DS[0].PH[0].DM0[0].M0;
        console.log('cases',cases);
        self.sendSocketNotification('NVSTAT_DEATHS', cases)
      }
    })
  },
  getNVStatCases: function(payload) {
    var self = this
    var options = {
      method: 'POST',
      headers: {'content-type': 'application/json' },
      url: msbi,
      body: JSON.stringify(msbi_ppcases),
      gzip: true
    }
    request(options, function (error, response, body) {
      if (!error && response.statusCode == 200) {
        console.log('getNVStatCases',body)
        var result = JSON.parse(body)
        var cases = result.results[0].result.data.dsr.DS[0].PH[0].DM0[0].M0;
        console.log('cases',cases);
        self.sendSocketNotification('NVSTAT_CASES', cases)
      }
    })
  },
  getNewCountyStats: function (payload) {
    var self = this
    var options = {
      method: 'GET',
      url: newcountyStats
    }
    request(options, function (error, response, body) {
      if (!error && response.statusCode == 200) {
        var result = JSON.parse(body)
        self.sendSocketNotification('NEWCOUNTY_RESULT', result)
      }
    })
  },
  getCountyStats: function (payload) {
    var self = this
    var options = {
      method: 'GET',
      url: countyStats
    }
    request(options, function (error, response, body) {
      if (!error && response.statusCode == 200) {
        var result = JSON.parse(body)
        self.sendSocketNotification('COUNTY_RESULT', result)
      }
    })
  },
  getStatsUS: function (payload) {
    var self = this
    var options = {
      method: 'GET',
      url: usStats
    }
    request(options, function (error, response, body) {
      if (!error && response.statusCode == 200) {
        var result = JSON.parse(body)
        self.sendSocketNotification('USSTATES_RESULT', result)
      }
    })
  },
  getStatesDaily: function(payload) {
    console.log('USSTATEDAILY_RESULT')
    var self = this
    var options = {
      method: 'GET',
      url: usStatsDaily
    }
    request(options, function (error, response, body) {
      if (!error && response.statusCode == 200) {
        var result = JSON.parse(body)
        self.sendSocketNotification('USSTATEDAILY_RESULT', result)
      }
    })
  },
  //Subclass socketNotificationReceived received.
  socketNotificationReceived: function (notification, payload) {
    console.log('socketNotificationReceived node_helper')
    if (notification === 'GET_US_STATS') 
      this.getStatsUS(payload);
    if (notification === 'GET_US_DAILY') 
      this.getStatesDaily(payload);
    if (notification === 'GET_COUNTY') 
      this.getCountyStats(payload);
    if (notification === 'GET_NEWCOUNTY') 
      this.getNewCountyStats(payload);
    if (notification === 'GET_NVSTATS_CASES') 
      this.getNVStatCases(payload);
      if (notification === 'GET_NVSTATS_DEATHS') 
      this.getNVStatDeaths(payload);
  }

});
