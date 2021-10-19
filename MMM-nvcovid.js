
//https://docs.magicmirror.builders/development/core-module-file.html#available-module-instance-properties

Module.register("MMM-nvcovid", {
	usStats: {},
	usStatsByState: {},
	usDaily: {},
	usDailyFilter: {},
	usDailyByDate: {},
	countyStats: {},
	nvstats: {},
	defaults: {
		states: ['CA', 'LA', 'NY', 'NV'],
		highlightStates: ['NV'],
		updateInterval: 300000, // update interval in milliseconds
		fadeSpeed: 4000,
		header: 'COVID-19',
	},
	//Called before dom is ready
	start: function () {
		this.getInfo();
		this.scheduleUpdate();
	},
	getInfo: function () {
		this.sendSocketNotification('GET_NVSTATS_CASES', this.config);
		this.sendSocketNotification('GET_NVSTATS_DEATHS', this.config);
		this.sendSocketNotification('GET_US_STATS',this.config);
		this.sendSocketNotification('GET_US_DAILY', this.config);
		this.sendSocketNotification('GET_NEWCOUNTY', this.config);
	},
	scheduleUpdate: function (delay) {
		var nextLoad = this.config.updateInterval
		if (typeof delay !== "undefined" && delay >= 0) {
			nextLoad = delay
		}
		var self = this
		setInterval(function () {
			self.getInfo()
		}, nextLoad)
	},
	dateformat: function (now) {
		var nm = (now.getMonth() + 1).toString();
		if (nm.length == 1) nm = '0' + nm;
		var nd = now.getDate().toString();
		if (nd.length == 1) nd = '0' + nd;
		var nowstr = now.getFullYear().toString() + nm + nd;
		return nowstr;
	},
	socketNotificationReceived: function (notification, payload) {
		var self = this
		if (notification === "NVSTAT_CASES") {
			console.log('NVSTAT_CASES',payload);
			this.nvstats['cases'] = payload;
			this.updateDom(self.config.fadeSpeed)
		}
		if (notification === "NVSTAT_DEATHS") {
			console.log('NVSTAT_DEATHS',payload);
			this.nvstats['deaths'] = payload;
			this.updateDom(self.config.fadeSpeed)
		}
		if (notification === "USSTATES_RESULT") {
			this.usStats = payload
			no = {};
			for (let key in payload) {
				var v = payload[key]
				no[v['state']] = v;
			}
			this.usStatsByState = no;
			this.updateDom(self.config.fadeSpeed)
		}
		if (notification === "COUNTY_RESULT") {
			var locations = payload['locations'];
			var na = {};
			for (var l in locations) {
				var value = locations[l];
				var county = value['county']
				na[county] = value;
			}
			console.log('COUNTY_RESULT',na);
			this.countyStats = na;
			this.updateDom(self.config.fadeSpeed)
		}
		if (notification === "NEWCOUNTY_RESULT") {
			var na = {};
			for (var i in payload) {
				var value = payload[i];
				if (value['country'] !== 'United States') continue;
				if (value['state'] !== 'Nevada') continue;
				if (value['level'] !== 'county') continue;
				var cases = 'cases' in value ? value['cases'] : '0';
				var deaths = 'deaths' in value ? value['deaths'] : '0';
				var active = 'active' in value ? value['active'] : '';
				var recovered = 'recovered' in value ? value['recovered'] : '';
				if (cases == 0 && deaths == 0) continue;
				//by county, latest -> confirmed, deaths
				var county = value['county'];
				na[county] = { 'latest': { 'confirmed': cases, 'deaths': deaths, 'active': active, 'recovered': recovered }}
			}

			console.log('NEWCOUNTY_RESULT',na);
			this.countyStats = na;
			this.updateDom(self.config.fadeSpeed)
		}
		
		if (notification === "USSTATEDAILY_RESULT") {
			var now = new Date();
			var yesterday = new Date();
			yesterday.setDate(yesterday.getDate() - 1);
			var nowstr = this.dateformat(now);
			var yesstr = this.dateformat(yesterday);
			var na = {};
			var alldata = {};
			for (let key in payload) {
				var value = payload[key];
				var state = value['state']
				if (!this.config.states.includes(state)) continue;
				if (!(state in na))
					na[state] = {};
				if (!(state in alldata))
					alldata[state] = {};
				var dt = value['date'];
				alldata[state][dt] = value;
				if (dt == nowstr) {
					na[state]['today'] = value;
				}
				if (dt == yesstr)
					na[state]['yesterday'] = value;
			}
			this.usDailyFilter = na;
			this.usDailyByDate = alldata;
			this.usDaily = payload

			this.updateDom(self.config.fadeSpeed)
		}
	},
	getHeader: function () {
		return this.config.header
	},
	getStyles: function () {
		return ["MMM-nvcovid.css"]
	},
	getScripts: function () {
		return ["https://cdn.jsdelivr.net/npm/chart.js"]
	},
	getStatsRow: function (state, value) {
		var tr = document.createElement("tr");
		if (this.config.highlightStates.includes(state))
			tr.className = 'highlight';

		var stateName = document.createElement("td");
		stateName.innerHTML = this.numberWithCommas(state);
		tr.appendChild(stateName);

		var tpositive = 0, tnegative = 0, tdeath = 0, ypositive = 0, ynegative = 0, ydeath = 0;
		var modify = '';

		if (state in this.usStatsByState) {
			
			var today = this.usStatsByState[state];
			tpositive = today['positive'];
			tnegative = today['negative'];
			tdeath = today['death'];
			modify = today['dateModified'];
		}
		if ('yesterday' in value) {
			var yesterday = value['yesterday'];
			ypositive = yesterday['positive'];
			ynegative = yesterday['negative'];
			ydeath = yesterday['death'];
		}

		var diff_positive = parseInt(tpositive) - parseInt(ypositive);
		if (diff_positive > 0 ) diff_positive = diff_positive.toString() + " <span style='color:red'>\u2191</span>";
		else diff_positive = diff_positive.toString() + " <span style='color:green'>\u2193</span>"
		var diff_negative = parseInt(tnegative) - parseInt(ynegative);
		if (diff_negative > 0 ) diff_negative = diff_negative.toString() + " <span style='color:red'>\u2191</span>";
		else diff_negative = diff_negative.toString() + " <span style='color:green'>\u2193</span>"
		var diff_death = parseInt(tdeath) - parseInt(ydeath);
		if (diff_death > 0 ) diff_death = diff_death.toString() + " <span style='color:red'>\u2191</span>";
		else diff_death = diff_death.toString() + " <span style='color:green'>\u2193</span>"

		var positive = document.createElement("td");
		positive.innerHTML = this.numberWithCommas(tpositive) + ' - ' + this.numberWithCommas(diff_positive);
		tr.appendChild(positive);

		var negative = document.createElement("td");
		negative.innerHTML = this.numberWithCommas(tnegative) + ' - ' + this.numberWithCommas(diff_negative);
		tr.appendChild(negative);

		var death = document.createElement("td");
		death.innerHTML = this.numberWithCommas(tdeath) + ' - ' + this.numberWithCommas(diff_death);
		tr.appendChild(death);

		var lastupdate = document.createElement("td");
		var lm = modify;//value['today']["dateChecked"];
		//2020-04-03T04:00:00Z
		let dateToLocalTimezone = new Date(lm);
		var h = dateToLocalTimezone.getHours().toString();
		if (h.length == 1) h = ' ' + h;
		var m = dateToLocalTimezone.getMinutes().toString();
		if (m.length == 1) m = '0' + m;
		var lms = (dateToLocalTimezone.getMonth()+1) + '/' + dateToLocalTimezone.getDate().toString() + ' ' + h + ':' + m;
		lastupdate.innerHTML = lms;
		tr.appendChild(lastupdate);
		return tr;

	},
	getDom: function () {
		try {
		console.log('getDom');
		// if (!this.usDailyFilter || this.usDailyFilter == {}) return document.createElement('div');
		var div = document.createElement("div")
		var wrapper = document.createElement("table");
		wrapper.className = 'covid';
		var thead = document.createElement("thead");
		var trow = document.createElement("tr");
		trow.innerHTML = "<th>State</th><th>Positive</th><th>Negative</th><th>Deaths</th><th>Last Update</th>";
		thead.appendChild(trow);
		wrapper.appendChild(thead)
		for (let key in this.usDailyFilter) {
			let value = this.usDailyFilter[key];
			var tr = this.getStatsRow(key, value);
			wrapper.appendChild(tr);
		}
		var td = new Date();
		var tds = new Date();
		tds.setDate(tds.getDate()-14);
		tda = [];
		while (tds <= td) {
			var m = (tds.getMonth()+1).toString();
			if (m.length == 1) m = '0' + m;
			var d = tds.getDate().toString();
			if (d.length == 1) d = '0' + d;
			var ds = tds.getFullYear().toString() + m + d;
			tda.push(ds);
			tds.setDate(tds.getDate()+1);
		}
		var d = [];
		labels = [];
		for (let key in this.usDailyByDate) {
			if (key !== 'NV') continue;
			for (let key2 in this.usDailyByDate[key]) {
				if (!tda.includes(key2)) continue;
				console.log(key, key2, this.usDailyByDate[key][key2]);
				var pi = this.usDailyByDate[key][key2]['positiveIncrease'];
				var day = key2;
				if (!pi) continue;
				d.push(pi);
				var df = day.substring(4);
				var month = df.substring(2);
				var day2 = df.replace(month,'');
				labels.push(day2 + '/' + month);
			}
		}
		var canvas = document.createElement("canvas");
		var context = canvas.getContext("2d");
		Chart.defaults.global.defaultFontSize = 40;
		var config = {
			type: 'line',
			data: {
				labels: labels,

				datasets: [{
					label: 'set label',
					backgroundColor: 'rgb(255, 99, 132)',
					borderColor: 'rgb(255, 99, 132)',
					data: d,
					fill: false
				}],
			},
			options: {
				legend: {
					display: false,
					labels: {
					}
				},
				scales: {
					xAxes: [{

						ticks: {
							display: false //this will remove only the label

						}
					}],
					yAxes: [{
						gridLines: {
						  },
						ticks: {
							display: false //this will remove only the label

						}
					}]
				}
			}

		}
		console.log(config);
		// canvas.style.height = "200px";
		canvas.style.maxHeight = "150px";
		var canvasdiv = document.createElement("div");
		canvasdiv.appendChild(canvas);
		div.appendChild(canvasdiv)
		var nc = new Chart(context, config);
		var contentdiv = document.createElement("div");
		contentdiv.style.marginTop = "20px";
		contentdiv.appendChild(wrapper);
		div.appendChild(contentdiv);

		var cdiv = document.createElement("div");
		var ctable = document.createElement("table");
		var chead = document.createElement('thead');
		var cheadtr = document.createElement('tr');
		cheadtr.innerHTML = "<th>County</th><th>Confirmed</th><th>Deaths</th><th>Active</th><th>Recovered</th>"
		chead.appendChild(cheadtr)
		ctable.appendChild(chead);
		ctable.id = "tblcounty";
		var allowed_counties = ['Carson City','Lyon County','Clark County','Washoe County','Storey County','Douglas County'];
		for (var c in this.countyStats) {
			
			var value = this.countyStats[c];

			var tr = document.createElement("tr");
			if (c === 'Carson City')
				tr.className = "highlight";
			if (!allowed_counties.includes(c)) continue;
			
			var county = document.createElement("td");
			county.innerHTML = c;
			tr.appendChild(county);

			var latest = value['latest'];
			console.log('latest',latest);
			var confirmed = latest['confirmed'];
			var td_confirmed = document.createElement('td');
			td_confirmed.innerHTML = confirmed;
			tr.appendChild(td_confirmed);

			var deaths = latest['deaths'];
			var td_deaths = document.createElement("td");
			td_deaths.innerHTML = deaths;
			tr.appendChild(td_deaths);

			var td_active = document.createElement("td");
			td_active.innerHTML = latest['active'];
			tr.appendChild(td_active);

			var td_recovered = document.createElement("td");
			td_recovered.innerHTML = latest['recovered'];
			tr.appendChild(td_recovered);

			ctable.appendChild(tr);
		}
		cdiv.appendChild(ctable);

		console.log('nvstats:',this.nvstats);
		var tblnv = document.createElement("table");
		tblnv.id = "tblnv";
		var nvtr = document.createElement("tr");
		
		var nvtd1 = document.createElement("td");
		if ('cases' in this.nvstats) nvtd1.innerHTML = this.nvstats['cases']
		nvtr.appendChild(nvtd1);
		var nvtd2 = document.createElement("td");
		if ('deaths' in this.nvstats) nvtd2.innerHTML = this.nvstats['deaths']
		nvtr.appendChild(nvtd2);

		tblnv.appendChild(nvtr);
		cdiv.appendChild(tblnv);
	
		div.appendChild(cdiv);
		return div;
	} catch(err) {
		console.log('ERR',err)
	} 
	},
	// insert separating commas into a number at thousands, millions, etc
	numberWithCommas: function (x) {
		if (!x) return x;
		return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
	},
});
