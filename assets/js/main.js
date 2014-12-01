	var reqAnimationFrame = (function () {
	    return window[Hammer.prefixed(window, 'requestAnimationFrame')] || function (callback) {
	        window.setTimeout(callback, 1000 / 60);
	    };
	})();


function hammerTime(main, offX, offY, startScale){
	if(!startScale) startScale = 1;

	var el = document.getElementById('iscrollHolder');
	var transform = {
	        translate: { x:offX * startScale, y: offY * startScale },
	        x: offX * startScale,
	        y: offY * startScale,
	        scale: startScale,
	        angle: 0,
	        rx: 0,
	        ry: 0,
	        rz: 0
	    };
	var timer;
	var ticking = false;

	function updateElementTransform() {
	    var value = [
	        'translate(' + (transform.translate.x - (offX * transform.scale)) + ', ' + (transform.translate.y - (offY * transform.scale)) + ')',
	        'scale(' + transform.scale + ', ' + transform.scale + ')',
	        'rotate(' + transform.angle + ',' + offX +','+ offY + ')'
	    ].join(" ");

	    main.attr('transform', value);
	    ticking = false;
	}

	function requestElementUpdate() {
	    if(!ticking) {
	        reqAnimationFrame(updateElementTransform);
	        ticking = true;
	    }
	}

	function onPan(ev) {
	    el.className = '';
	    transform.translate = {
	        x: transform.x + ev.deltaX,
	        y: transform.y + ev.deltaY
	    };

	    requestElementUpdate();
	}

	var initScale = 1;
	function onPinch(ev) {
	    if(ev.type == 'pinchstart') {
	        initScale = transform.scale || 1;
	    }

	    el.className = '';
	    transform.scale = Math.max(0.2, initScale * ev.scale);

	    requestElementUpdate();
	}

	var initAngle = 0;
	function onRotate(ev) {
	    if(ev.type == 'rotatestart') {
	        initAngle = transform.angle || 0;
	    }

	    el.className = '';
	    transform.rz = 1;
	    transform.angle = initAngle + ev.rotation;

	    requestElementUpdate();
	}

	var mc = new Hammer.Manager(el);

	mc.add(new Hammer.Pan({ threshold: 0, pointers: 0 }));
	mc.add(new Hammer.Rotate({ threshold: 0 })).recognizeWith(mc.get('pan'));
	mc.add(new Hammer.Pinch({ threshold: 0 })).recognizeWith([mc.get('pan'), mc.get('rotate')]);

	mc.on("panstart panmove", onPan);
	mc.on("panend", function(){
		transform.x = transform.translate.x;
		transform.y = transform.translate.y;
	});
	mc.on("rotatestart rotatemove", onRotate);
	mc.on("pinchstart pinchmove", onPinch);
	requestElementUpdate();
};
