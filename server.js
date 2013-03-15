
const PATH = require("path");
const PINF = require("pinf");
const EXPRESS = require("express");


var pinf = PINF.for(module);


function main(callback) {

    var app = EXPRESS();

    function loadApp(callback) {
	    try {
	    	var handlerPath = require.resolve(PATH.dirname(pinf.config().pinf.paths.program));

		    var responder = require(handlerPath);

		    return responder.init(PINF.forProgram({
				filename: handlerPath
			})(handlerPath), function(err) {
		    	if (err) return callback(err);

		    	app.use(function(req, res) {
		    		function fail(err) {
						console.error("ERROR", err.stack);
						res.writeHead(500, "Internal Server Error");
						return res.end(JSON.stringify({
							error: err.stack
						}, null, 4));
		    		}
		    		try {
			    		return responder.connect(req, res, function(err) {
			    			if (err) return fail(err);
							res.writeHead(404, "Not Found");
							return res.end(JSON.stringify({
								error: "NOT_FOUND"
							}, null, 4));
			    		});
			    	} catch(err) {
			    		return fail(err);
			    	}
		    	});

		    	return callback(null);
		    });

	    } catch(err) {
	    	return callback(err);
	    }
	}

	return loadApp(function(err) {
		if (err) return callback(err);

	    app.listen(8080);
	    console.log("Listening on port: 8080");
	});
}


if (require.main === module) {
	pinf.run(main);
}
