
let App = {};

App.init = function () {
    console.log('Initializing App...');
    this.options = {...this.options, ...options};
    this.loadEvents();
}

App.loadEvents = function() {
}


window.App = App || {};
let options = {

};

App.init(options)
