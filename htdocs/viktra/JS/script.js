   	var width, heightSide, heightFb, depth, roofHeight, palgiPaksus, palgiKorgus, ruumala, pindala, jooksevMeeter, canvasHeight, gableLaudadeArv,gableJooksevMeeter;
    var gableArvutuslikLaius, gableArvutuslikKorgus, palgiPikkus, palgiPikkusKokku = 0, uksed = [], uksedKokkuPindala = 0, ukseLaius = 0, ukseKorgus = 0, uksKogus = 0;
	var uksedJooksvadMeetrid = 0, pikemadLauad = [], pikemadLauadJooksvadMeetrid=0, pikemLaudPikkus = 0, pikemLaudKogus = 0, pikemadLauadArv = 0, pikemadLauad114Arv = 0;
	var pikemadLauadLisaKulu = 0, pikemadLauad114LisaKulu = 0; pikemLaudKorgus = 0, aknad = [], aknadLaius =0, aknadKorgus =0, aknadKokkuPindala =0, aknadJooksvadMeetrid = 0;
	var joonestatud = false; pikemadLauadArvtatud = false; uksedArvutatud = false; aknadArvutatud = false; arvutaTulemusedArvutatud = false, vundamentArvutatud = false;
    var seinaPindala1 = 0, seinaPindala2 = 0, seinaPindala3 = 0, katuseKolmnurk = 0, arvutusTulemused = 0, ruumala2 = 0, palkTipust, seinaPindala1jm = 0;
    var seinaPindala2jm = 0, seinaPindala3jm = 0, lahutatav = 0;
    var pindalaInfo = document.querySelector(".pindalaInfo");
    var gablePalgidInfo = document.querySelector(".gablePalgidInfo");
    var gablePalgid2Info;
    var jooksvadMeetridInfo = document.querySelector(".jooksvadMeetridInfo");
    var pikemadLauad2Info = document.querySelector(".pikemadLauad2Info");
    var uksed2Info = document.querySelector(".uksed2Info");
    var aknad2Info = document.querySelector(".aknad2Info");
    var vundament2Info = document.querySelector(".vundament2Info");
    var porand2Info = document.querySelector(".porand2Info");
	var katus2Info = document.querySelector(".katus2Info");
	var parlin2info = document.querySelector(".parlin2Info");
    var detailInfoDiv = document.querySelector("#detailInfo");
    var seinapindalaTaga = 0, seinapindalaKylg = 0, kolmnurk3 = 0, kolmnurkArvutuslikKorgus = 0, kolmnurkArvutuslikLaius = 0, seinaPindalaEest = 0;

    var tuuleliistudInfo = document.querySelector(".tuuleliistudInfo");
    var arvuta2Count = 0;
    var pikemLaudKorgem=[], pikemadLauad114jm = 0;
    var canvas = document.getElementById("majaJoonis");
    var c = canvas.getContext("2d");
    var ratio, keskX, keskY, algusX1, algusY1, algusX2, algusY2, yleOsa, pikkus, laius;
    var modal = document.querySelector("#myModal");
    var modalPealkiri = modal.querySelector(".modal-header h2");
    var modalBody = modal.querySelector(".modal-body"),tapsemadSeadedAvatudVundament = false, tapsemadSeadedLahtiVundament = false, tapsemadSeadedAvatudPorand = false; tapsemadSeadedLahtiPorand = false;
    var fontSize, prussideArv = 0, prussideVahe, vundament=[], porand = [], porandaSuund = "AB", vundamendiSuund = "1->2", prussideArv, prussiKaugusValisseinastAB = 0, prussiKaugusValisseinast12 = 0;
    var prussiKorgus, prussiLaius, vundamendiRing = false, prussideArvTapsem, prussiKaugus12, prussiKaugusAB, muudaVundamentRun = false, vundamendiPikkus, porandaLaudadeArv, porandaKaugusSeinast =5;
    var porandaLauaLaius, porandaLauaPikkus, porandaLaudJm, muudaPorandRun = false, porandArvutatud = false, porandaSuundVarem = false, porandLisatud = false, vundamentLisatud = false;
    var vundamendiKulu = 0, porandaKulu = 0, katusArvutatud = false, arvutusTulemusedMujalt = false, pikimLaud = [];
    var katuseLauaPikkus = 0, katuseLauaYleulatus = 0, katuseLaudadeArv = 0, katuseLauaPikkusArvutuslik = 0, hypotenuus, katusePikkus, katuseKolmnurgaAlus = 0, KatuseKolmnurgaKorgus;
    var katuseNurk3, katusArvutatud = false, muudaKatusRun = false, katus = [], katuseLauadJm = 0, parlinArvutatud = false, parlinLisatud = false, parlinArv, parlinKorgus, parlinLaius, parlinVahe;
    var parlinPikkus, parlinArvArvutuslik, muudaParlinRun = false, parlin = [], arvutaKoikCount = 0, katuseLauaYleulatusArvutuslik = 0, katuseLauaYleulatusJoonisel = 0;
    var akendeSeeria = 0, usteSeeria = 0, servaLauadKokku = 0, katuseLaudadeKulu = 0, parlinKulu =0, poradanaKulu = 0, vundamendiPrussidKulu = 0, katusLisatud = false;
    var canvaseSisu = "", fondiTegurMaaratud = false;
    /* var hinnad = {katuseServaLauad: 0.69,katuseLauad: 0.69,parlinid: 1.85,seinaLauad: 1.33,porandaLauad: 0.69,vundament: 0.97,tuuleLiist: 0.30,esiraastalaud: 0.69,papikinnituslaud: 0.62,toelaud38: 0.50,toelaud90: 0.62}; */
    var hinnad = {katuseLauad: 0,  parlinid: 0, seinaLauad: 0,porandaLauad: 0,vundament: 0,tuuleLiist: 0,esiraastalaud: 0,papikinnituslaud: 0,toelaud38: 0,toelaud95: 0};
    var arvutaTulemusedArvutatud = false, vundamentArvutatud = false, seeriateArv = 0, uksHinnad=[], usteHinnad="", usteHindSalvestatud = false, usteSummaKokku =0;
    var jooksvadMeetridSummaKokku = 0, katuseLauadSummaKokku = 0, servalauadSummaKokku = 0, parlinSummaKokku = 0, porandaSummaKokku = 0;
    var tuuleliistudSummaKokku = 0, vundmendiSummaKokku = 0, summeeritudSumma = 0, aknaMaxSeeria = 0, aknaHinnad=[], akendeHinnad="", akendeHindSalvestatud = false, akendeSummaKokku =0;;
    var katusePikkusJoonisel = 0, keskYParandus = 0, keskXParandus = 0, tipuParlin = false, fondiTegur = 0;
    var papikinnituslaud = "18x95", toelaud = "38x38", toelaudSuurem = "18x95", esiraastalaud = "18x120", yleOsa;
    var prussiH, prussiW;
    var a = document.getElementById("svgObject");
    let dpi = window.devicePixelRatio;
    var yhekaldneKatus = false;
    var viilKatus = false;

    function moodud(){
        
        if(document.querySelector("#misPikkus").value == "sise"){
            width = Number(document.querySelector("#cab_width").value)+280;
            depth = Number(document.querySelector("#cab_depth").value)+280;
		} else if(document.querySelector("#misPikkus").value == "valis") {
            width = Number(document.querySelector("#cab_width").value)+200;
            depth = Number(document.querySelector("#cab_depth").value)+200;
		} else {
            width = Number(document.querySelector("#cab_width").value);
            depth = Number(document.querySelector("#cab_depth").value);
		}
        heightSide = Number(document.querySelector("#cab_height_side").value);
        heightFb = Number(document.querySelector("#cab_height_fb").value);
		roofHeight = Number(document.querySelector("#cab_roofHeight").value); //ühekaldelise puhul tagaseina kõrgus
        palgiPaksus = Number(document.querySelector("#palgiPaksus").value);
        palgiKorgus = Number(document.querySelector("#palgiKorgus").value);
        //console.log("Laius on: "+width);
        //console.log("Sügavus on: "+depth);
        //return width, depth, heightSide, heightFb, roofHeight, palgiPaksus, palgiKorgus;
    }
    function setCanvasHeight(korgus){
        var canvas1 = document.getElementById("majaJoonis");
        var canvas2 = document.getElementById("blank");
		var divLaius = document.querySelector("#joonis").clientWidth;
		      
        if (divLaius < window.innerHeight){
            //canvasHeight = divLaius*0.9;
            if(korgus == "" || korgus == null){
                canvasHeight = 475 ;
            }else{
                canvasHeight = korgus;
            }
        } else {
            if(korgus == "" || korgus == null){
                canvasHeight = 475 ;
            }else{
                canvasHeight = korgus;
            }
        }
        
/*        if(canvas1.height == (window.innerHeight *0.96) || canvas1.height == (window.innerWidth*0.47)){
            alert("Canvas on juba õige suurusega!")
        }else{*/
        canvas1.height = canvasHeight;
        canvas1.width = canvasHeight;
        canvas2.height = canvasHeight;
        canvas2.width = canvasHeight;
		if(joonestatud == true){joonesta();}
        if(arvutaTulemusedArvutatud == true){arvutaUus()};
        if(pikemadLauadArvtatud == true){pikemLaudSum2()};
        if(uksedArvutatud == true){uksedSum()};
        if(aknadArvutatud == true){aknadSum()};
        if(vundamentArvutatud == true){vundamentKirjuta()};
        if(tapsemadSeadedLahtiPorand == true || tapsemadSeadedLahtiVundament){tapsemadSeadedKorgus()};
        if(porandArvutatud == true){porandKirjuta()};
		if(katusArvutatud == true){lisakatusKirjuta()};
		if(parlinArvutatud == true){lisaParlinKirjuta()};
    };
    
    function arvutaKoikUuesti() {
        arvutaKoikCount += 1
        if(pikemadLauadArvtatud == true){pikemLaudSum2()};
        if(uksedArvutatud == true){uksedSum()};
        if(aknadArvutatud == true){aknadSum()};
        if(vundamentArvutatud == true){vundamentKirjuta()};
        if(porandArvutatud == true){porandKirjuta()};
		if(katusArvutatud == true){lisakatusKirjuta()};
		if(parlinArvutatud == true){lisaParlinKirjuta()};
    }


    function setBodyHeight() {
        
        if(window.innerHeight > document.documentElement.scrollHeight){
            document.querySelector("#sisend").style.minHeight = window.innerHeight + "px";
        }else if (window.innerHeight == document.documentElement.scrollHeight){
            document.querySelector("#sisend").style.minHeight = window.innerHeight+ "px";
        }else{
            document.querySelector("#sisend").style.minHeight = document.documentElement.scrollHeight+ "px";
        }
    }
    
    function arvuta() {
        moodud();
        if (heightFb == null || heightFb == "") {
            pindala = ((width-200) * (depth-200))/1000000;
            return pindala;
        }else{
            ruumala = ((width-200) * heightSide * (depth-200))/(1000000000);
			pindala = ((width-200) * (depth-200))/1000000;
            return ruumala;  
        }
        
    }

	function arvuta2(){
        arvuta2Count+=1;
		moodud();
		arvuta();
        arvutaTulemusedArvutatud = true;
		jooksevMeeter = 0;
        seinaPindala1 = (Number(width* heightFb)/1000000)*2;
        seinaPindalaEest = (Number(width*heightFb)/1000000)
        seinaPindala2= (Number(depth * heightSide)/1000000)*2;
        if(!viilKatus){
            kolmnurk3 = Number((heightFb-roofHeight)*depth/1000000)*2
            seinapindalaKylg=Number(kolmnurk3+((depth*roofHeight)/1000000)*2)
            seinapindalaTaga=Number((depth*roofHeight)/1000000)
        }
		if(viilKatus) {
            katuseKolmnurk = (Number((width-200) * (roofHeight-heightSide)/2)/1000000);
            //console.log("Esi ja tagaseina pindala: "+seinaPindala1);
        }else{
            //console.log("Esiseina pindala: "+seinaPindala1);
            //console.log("Tagaseina pindala: "+seinapindalaTaga);
            //console.log("Küljeseinte pindala: "+seinapindalaKylg);
        }
        if(viilKatus){
            seinaPindala1jm = Math.floor(heightFb/palgiKorgus)*width/1000*2+palgiKorgus/(palgiKorgus*(heightFb/palgiKorgus-Math.floor(heightFb/palgiKorgus)))*width/1000;
            if((heightSide/palgiKorgus)==(Math.floor(heightSide/palgiKorgus))){lahutatav = 0}else{lahutatav = 1}
            seinaPindala2jm = (Math.floor(heightSide/palgiKorgus)-lahutatav)*depth*2/1000+pikemadLauad114LisaKulu;
            //console.log("Küljeseinte pindala: "+seinaPindala2);
            //console.log("Katuse kolmnurkade pindala: "+Number(katuseKolmnurk*2).toFixed(2));
            jooksevMeeter = (seinaPindala1jm+seinaPindala2jm)+gableJooksevMeeter+pikemadLauadJooksvadMeetrid;
            ruumala2 = Number(ruumala+katuseKolmnurk*(depth-200)/1000);
            //console.log(Number(jooksevMeeter).toFixed(2)+" jm");
        }else{
            if((heightFb/palgiKorgus)==(Math.floor(heightFb/palgiKorgus))){lahutatav = 0}else{lahutatav = 1}
            seinaPindala1jm = Math.floor(heightFb/palgiKorgus-lahutatav)*width/1000+palgiKorgus/(palgiKorgus*(heightFb/palgiKorgus-Math.floor(heightFb/palgiKorgus)))*width/1000+pikemadLauad114LisaKulu/2;
            //console.log("Lamekatuse esisein jooksvad meetrid: "+seinaPindala1jm);
            if((roofHeight/palgiKorgus)==(Math.floor(roofHeight/palgiKorgus))){lahutatav = 0}else{lahutatav = 1}
            seinaPindala2jm = Math.floor(roofHeight/palgiKorgus-lahutatav)*width/1000+palgiKorgus/(palgiKorgus*(roofHeight/palgiKorgus-Math.floor(roofHeight/palgiKorgus)))*width/1000+pikemadLauad114LisaKulu/2;
            //console.log("Lamekatuse tagasein jooksvad meetrid: "+seinaPindala2jm);
            seinaPindala3jm = (Math.floor((roofHeight-(palgiKorgus/2))/palgiKorgus))*depth*2/1000;
            //console.log("Lamekatuse küljesinte jooksvad meetrid: "+seinaPindala3jm);
            jooksevMeeter = (seinaPindala1jm+seinaPindala2jm+seinaPindala3jm)+gableJooksevMeeter+pikemadLauadJooksvadMeetrid;
            ruumala2 = Number(ruumala+kolmnurk3*(width-200)/1000);
            //console.log("Lamekatuse jooksvad meetrid: "+jooksevMeeter);
        }

		arvutusTulemused = document.querySelector("#arvutuseTulemused");
        let arvutusTulemused2 = document.querySelector("#arvutuseTulemused2");
        
		if(uksedJooksvadMeetrid !==0 || aknadJooksvadMeetrid !== 0){
			arvutusTulemused.querySelector(".ymbris").innerHTML = (
				"<ul>\
					<li>Vajalik seinamaterjali kogus on (ilma uste ja akende avadeta): "+Number(jooksevMeeter).toFixed(2)+" jm</li>\
					<li>Vajalik seinamaterjali kogus on (uste ja akende avadega): "+Number(jooksevMeeter-Number(uksedJooksvadMeetrid)-Number(aknadJooksvadMeetrid)).toFixed(2)+" jm</li>\
					<li>Maja poolt hõlmatav pindala on: "+pindala+" m<sup>2</sup></li>\
					<li>Maja sisene ruumala on: "+Number(ruumala2).toFixed(2)+" m<sup>3</sup></li>\
                </ul>");
                jooksevMeeterUksedAknad = Number(jooksevMeeter-Number(uksedJooksvadMeetrid)-Number(aknadJooksvadMeetrid));
		}else{    
			arvutusTulemused.querySelector(".ymbris").innerHTML = (
				"<ul>\
					<li>Vajalik seinamaterjali kogus on (ilma uste ja akende avadeta): "+Number(jooksevMeeter).toFixed(2)+" jm</li>\
					<li>Maja poolt hõlmatav pindala on: "+pindala+" m<sup>2</sup></li>\
					<li>Maja sisene ruumala on: "+Number(ruumala2).toFixed(2)+" m<sup>3</sup></li>\
				</ul>");
                jooksevMeeterUksedAknad = jooksevMeeter;
        }
        if(jooksevMeeterUksedAknad>0){
            jooksvadMeetridInfo.innerHTML = "";
            jooksvadMeetridInfo.innerHTML = "<li><span class='esimenePool'>Seinalauad: </span><span class='teinePool'>"+Number(jooksevMeeterUksedAknad).toFixed(2)+"</span> jm<span class='kolmasPool'>"+Number(jooksevMeeterUksedAknad*hinnad.seinaLauad).toFixed(2)+"</span> €</li>"
            jooksvadMeetridSummaKokku = Number(jooksevMeeterUksedAknad*hinnad.seinaLauad);
            tuuleliistudInfo.innerHTML ="";
            if(viilKatus){
                tuuleliistudInfo.innerHTML = "<li><span class='esimenePool'>Tuuleliistud: </span><span class='teinePool'>"+Number(4*heightSide/1000).toFixed(2)+"</span> jm<span class='kolmasPool'>"+Number((4*heightSide/1000)*hinnad.tuuleLiist).toFixed(2)+"</span> €</li>"
                tuuleliistudSummaKokku = Number((4*heightSide/1000)*hinnad.tuuleLiist);   
            }else{
                tuuleliistudInfo.innerHTML = "<li><span class='esimenePool'>Tuuleliistud: </span><span class='teinePool'>"+Number(2*(heightFb-palgiKorgus)/1000+2*(roofHeight-palgiKorgus)/1000).toFixed(2)+"</span> jm<span class='kolmasPool'>"+Number((2*(heightFb-palgiKorgus)/1000+2*(roofHeight-palgiKorgus)/1000)*hinnad.tuuleLiist).toFixed(2)+"</span> €</li>"
                tuuleliistudSummaKokku = Number((2*(heightFb-palgiKorgus)/1000+2*(roofHeight-palgiKorgus)/1000)*hinnad.tuuleLiist);    
            }
        }

		arvutusTulemused.style.transition = "height 1s";
		arvutusTulemused.style.border = "3px solid #2d6870";
		arvutusTulemused.style.borderRadius = "10px 0"
        arvutusTulemused.style.height = arvutusTulemused.querySelector(".ymbris").clientHeight+32+"px";
        
        arvutusTulemused2.querySelector(".ymbris").innerHTML = arvutusTulemused.querySelector(".ymbris").innerHTML
       
	}

	function arvutaUus() {
		moodud();
        if (gablePalgid2Info != "") {gablePalgid2Info = ""}
        palgiPikkusKokku=0;
        gableJooksevMeeter=0;
        if(viilKatus){
            gableLaudadeArv = Math.ceil((roofHeight-heightFb)/palgiKorgus);
            gableArvutuslikLaius = width - (2*(100+palgiPaksus));
            gableArvutuslikKorgus = roofHeight-heightSide;
        }else{
            kolmnurkLaudadeArv = Math.ceil((heightFb-(roofHeight-palgiKorgus/2))/palgiKorgus);
            //console.log("Kolmnurk laudade arv: "+kolmnurkLaudadeArv)
            kolmnurkArvutuslikLaius = depth-(2*(100)+palgiPaksus)
            // console.log("Kolmnurk arvutuslik laius: "+kolmnurkArvutuslikLaius)
            kolmnurkArvutuslikKorgus = (heightFb-roofHeight)*(depth-(100+palgiPaksus))/kolmnurkArvutuslikLaius
            // console.log("Kolmnurk arvutuslik kõrgus: "+kolmnurkArvutuslikKorgus)
            kolmnurgaKorgendus = kolmnurkArvutuslikKorgus - (heightFb-roofHeight)
            // console.log("Kolmnurga kõrgendus ", kolmnurgaKorgendus)
        }
		
        document.querySelector("#detailne").style.display = "block"
        document.querySelector(".majaInfo").style.display = "block"
        
        if(viilKatus){
            for (i=1; i<=gableLaudadeArv; i++) {
                var palkTipust;
                palkTipust=(gableLaudadeArv+1-i)*palgiKorgus;
                if (i===1){ 
                    gablePalgid2Info += "<li>"+i+". palgi kaugus tipust: "+Number(palkTipust).toFixed(2)+" mm</li>";
                    palgiPikkus=width;
                    gablePalgid2Info += "<li>"+i+". palgi pikkus on: "+Math.round(palgiPikkus)+" mm</li>";
                    palgiPikkusKokku += palgiPikkus;
                    //console.log("Palgi "+i+" kaugus tipust: "+palkTipust+"");
                    //console.log("Palgi "+i+" pikkus on: "+Math.round(palgiPikkus));
                    continue;}
                //console.log("Palgi "+i+" kaugus tipust: "+palkTipust+"");
                gablePalgid2Info += "<li>"+i+". palgi kaugus tipust: "+Number(palkTipust).toFixed(2)+" mm</li>";
                palgiPikkus= gableArvutuslikLaius*(palkTipust/gableArvutuslikKorgus);
                //console.log("Palgi "+i+" pikkus on: "+Math.round(palgiPikkus));
                gablePalgid2Info += "<li>"+i+". palgi pikkus on: "+Math.round(palgiPikkus)+" mm</li>";
                palgiPikkusKokku += palgiPikkus;
                
            }
            //console.log("Palkide kogu pikkus kokku on: "+Number(palgiPikkusKokku).toFixed(2));
            gableJooksevMeeter = 2*Number(palgiPikkusKokku/1000).toFixed(2);
            //console.log("Gable jooksvad meetrid on: "+gableJooksevMeeter);
    
            arvuta2();	
            //console.log("Ilma Gable-ta: "+Number(jooksevMeeter-gableJooksevMeeter-uksedJooksvadMeetrid-aknadJooksvadMeetrid).toFixed(2));
            detailInfo();
            arvutusTulemusedMujalt = false;
        }else{
            for (i=1; i<=kolmnurkLaudadeArv; i++) {
                var palkTipust=0;
                palkTipust=(kolmnurkLaudadeArv+1+-i)*palgiKorgus+kolmnurgaKorgendus-palgiKorgus/2;
                if (i===1){ 
                    gablePalgid2Info += "<li>"+i+". palgi kaugus tipust: "+Number(palkTipust).toFixed(2)+" mm</li>";
                    palgiPikkus=depth;
                    gablePalgid2Info += "<li>"+i+". palgi pikkus on: "+Math.round(palgiPikkus)+" mm</li>";
                     palgiPikkusKokku += palgiPikkus;
                    continue;}
                //console.log("Palgi "+i+" kaugus tipust: "+palkTipust+"");
                gablePalgid2Info += "<li>"+i+". palgi kaugus tipust: "+Number(palkTipust).toFixed(2)+" mm</li>";
                palgiPikkus=kolmnurkArvutuslikLaius*(palkTipust/(kolmnurkArvutuslikKorgus-kolmnurgaKorgendus));
                //console.log("Palgi "+i+" pikkus on: "+Math.round(palgiPikkus));
                gablePalgid2Info += "<li>"+i+". palgi pikkus on: "+Math.round(palgiPikkus)+" mm</li>";
                palgiPikkusKokku += palgiPikkus;
                
            }
            //console.log("Kolmnurga palkide kogu pikkus kokku on: "+Number(palgiPikkusKokku).toFixed(2));
            gableJooksevMeeter = 2*Number(palgiPikkusKokku/1000).toFixed(2);
            //console.log("Kolmnurga gable jooksvad meetrid on: "+gableJooksevMeeter);
            arvuta2();
            //console.log("Ilma kolmnurgata: "+Number(jooksevMeeter-gableJooksevMeeter-uksedJooksvadMeetrid-aknadJooksvadMeetrid).toFixed(2));
            detailInfo();
            arvutusTulemusedMujalt = false;
        }
	};


	function pikemLaudSum2(){
		pikemadLauadArvtatud = true;
        moodud();
		pikemadLauadArv = 0;
        pikemadLauad114Arv = 0;
		pikemadLauadJooksvadMeetrid = 0;
        pikemadLauad114jm = 0;
		pikemadLauadLisaKulu = 0;
        pikemadLauad114LisaKulu = 0;
		pikemLaudKogus, pikemLaudKorgus, pikemLaudKogus = 0;
        pikemLaudKorgem = []
		for(var i=0; i<pikemadLauad.length; i++){
			//console.log(pikemadLauad[i]);
      	    pikemLaudKorgem.push([Number(pikemadLauad[i]["korgus"])]);
			if(pikemadLauad[i]["korgus"]>114) {
                pikemadLauadJooksvadMeetrid += (pikemadLauad[i]["pikkus"]*pikemadLauad[i]["kogus"])
                pikemadLauadArv += pikemadLauad[i]["kogus"];
            }else if(pikemadLauad[i]["korgus"]<=114){
                pikemadLauad114jm+= (pikemadLauad[i]["pikkus"]*pikemadLauad[i]["kogus"])/1000
                pikemadLauad114Arv += pikemadLauad[i]["kogus"];
            };
            
		}
/* 		//console.log("Pikemad lauad jooksvates meetrites: "+pikemadLauadJooksvadMeetrid/1000+" m");
		//console.log("Pikemaid laudu on: "+pikemadLauadArv+" tk"); */
        //console.log(pikemadLauadArv, pikemadLauad114Arv);
        pikemadLauadJooksvadMeetrid=Number(pikemadLauadJooksvadMeetrid)/1000;
        if(viilKatus){
            pikemadLauadLisaKulu = Number(pikemadLauadJooksvadMeetrid-(pikemadLauadArv * depth/1000));
            pikemadLauad114LisaKulu = Number(pikemadLauad114jm-(pikemadLauad114Arv*depth/1000));
        }else{
            pikemadLauadLisaKulu = Number(pikemadLauadJooksvadMeetrid-(pikemadLauadArv * width/1000));
            pikemadLauad114LisaKulu = Number(pikemadLauad114jm-(pikemadLauad114Arv*width/1000));
        }

        pikemadLauadInfo = document.querySelector("#pikemadLauadInfo");
        let pikemadLauadInfo2 = document.querySelector("#pikemadLauadInfo2");
		if(Math.max.apply(this, pikemLaudKorgem)<=114){
            pikemadLauadInfo.querySelector(".ymbris").innerHTML = (
			"<ul>\
				<li>Pikemaid laudu kõrgusega "+Math.max.apply(this, pikemLaudKorgem)+" mm on: "+Number(pikemadLauad114jm).toFixed(2)+" jm</li>\
			</ul>");   
        }else if(Math.max.apply(this, pikemLaudKorgem)>114 && Math.min.apply(this, pikemLaudKorgem)<=114){
        pikemadLauadInfo.querySelector(".ymbris").innerHTML = (
			"<ul>\
				<li>Pikemaid laudu kõrgusega "+Math.max.apply(this, pikemLaudKorgem)+" mm on: "+Number(pikemadLauadJooksvadMeetrid).toFixed(2)+" jm</li>\
				<li>Pikemate laudade kõrgusega "+String.fromCharCode(8804)+" 114 mm lisakulu on: "+Number(pikemadLauad114LisaKulu).toFixed(2)+" jm</li>\
			</ul>");
        }else{
         pikemadLauadInfo.querySelector(".ymbris").innerHTML = (
			"<ul>\
				<li>Pikemaid laudu kõrgusega "+Math.max.apply(this, pikemLaudKorgem)+" mm on: "+Number(pikemadLauadJooksvadMeetrid).toFixed(2)+" jm</li>\
			</ul>");   
        }
		pikemadLauadInfo.style.transition = "height 1s";
		pikemadLauadInfo.style.border = "3px solid #2d6870";
		pikemadLauadInfo.style.borderRadius = "10px 0"
        pikemadLauadInfo.style.height = pikemadLauadInfo.querySelector(".ymbris").clientHeight+32+"px";
        eemaldaNuppKorgus();
        detailInfo();
        a.contentDocument.getElementById("pikemadlauad").style.display = "block";
        
        pikemadLauadInfo2.querySelector(".ymbris").innerHTML = pikemadLauadInfo.querySelector(".ymbris").innerHTML
        pikemadLauadInfo2.querySelector(".ymbris").querySelector("ul").innerHTML+= document.querySelector("#pikemateLaudadeNimekiri").innerHTML
        pikemadLauadInfo2.querySelectorAll("input").forEach(element => {element.outerHTML = ""});
        

	}

	function uksedSum(){
        uksedArvutatud = true;
		moodud();
		uksedJooksvadMeetrid =0;
		for(var i=0; i<uksed.length; i++){
			//console.log(uksed[i]);
			uksedKokkuPindala += (uksed[i]["ukselaius"])*(uksed[i]["uksekorgus"])*(uksed[i]["kogus"]);
            uksedJooksvadMeetrid += uksed[i]["ukselaius"]*Math.ceil(uksed[i]["uksekorgus"]/palgiKorgus)*uksed[i]["kogus"]/1000;
		}
		
		//console.log("Ruutmeetrites: "+Number(uksedKokkuPindala)/1000000+" m\u00B2");

		//console.log("Ukse auk jooksvates meetrites: "+uksedJooksvadMeetrid+" m");

		uksedKokkuPindala=uksedKokkuPindala/1000000;
        usteInfo = document.querySelector("#usteInfo");
        let usteInfo2 = document.querySelector("#usteInfo2")
		usteInfo.querySelector(".ymbris").innerHTML = (
			"<ul>\
				<li>Uste poolt hõlmatav pindala on: "+Number(uksedKokkuPindala).toFixed(2)+" m<sup>2</sup></li>\
				<li>Uste poolt välja arvatav materjali kogus on: "+Number(uksedJooksvadMeetrid).toFixed(2)+" jm</li>\
			</ul>");
		usteInfo.style.transition = "height 1s";
		usteInfo.style.border = "3px solid #2d6870";
		usteInfo.style.borderRadius = "10px 0";
		usteInfo.style.height = usteInfo.querySelector(".ymbris").clientHeight+32+"px";
        eemaldaNuppKorgus();
        usteInfoDetailidesse();
        detailInfo();
        a.contentDocument.getElementById("uks").style.display = "block";
        usteInfo2.querySelector(".ymbris").innerHTML = usteInfo.querySelector(".ymbris").innerHTML
        usteInfo2.querySelector(".ymbris").querySelector("ul").innerHTML+= document.querySelector("#ustenimekiri").innerHTML
        usteInfo2.querySelectorAll("input").forEach(element => {element.outerHTML = ""});
	}

	function aknadSum(){
		moodud();
        aknadArvutatud = true;
		aknadJooksvadMeetrid = 0;
		aknadJooksvadMeetrid2 = 0;
		for(var i=0; i<aknad.length; i++){
			//console.log(aknad[i]);
			aknadKokkuPindala += aknad[i]["laius"]*aknad[i]["korgus"]*aknad[i]["kogus"];
            aknadJooksvadMeetrid += aknad[i]["laius"]*Math.ceil(aknad[i]["korgus"]/palgiKorgus)*aknad[i]["kogus"]/1000;
		}
		aknadJooksvadMeetrid2 = Number(aknadKokkuPindala/palgiKorgus)/1000;
        //console.log("Pindala järgi akende jooksvad meetrid"+aknadJooksvadMeetrid2);
		//console.log("Ruutmeetrites: "+Number(aknadKokkuPindala)/1000000+" m\u00B2");

		//console.log("Jooksvates meetrites: "+aknadJooksvadMeetrid+" m");
		aknadKokkuPindala=aknadKokkuPindala/1000000;
		akendeInfo = document.querySelector("#aknadInfo");
		let akendeInfo2 = document.querySelector("#aknadInfo2");
		akendeInfo.querySelector(".ymbris").innerHTML = (
			"<ul>\
				<li>Akende poolt hõlmatav pindala on: "+Number(aknadKokkuPindala).toFixed(2)+" m<sup>2</sup></li>\
				<li>Akende poolt välja arvatav materjali kogus on: "+Number(aknadJooksvadMeetrid).toFixed(2)+" jm</li>\
			</ul>");
		akendeInfo.style.transition = "height 1s";
		akendeInfo.style.border = "3px solid #2d6870";
		akendeInfo.style.borderRadius = "10px 0"
		akendeInfo.style.height = akendeInfo.querySelector(".ymbris").clientHeight+32+"px";
        eemaldaNuppKorgus();
        akendeInfoDetailidesse();
        detailInfo();
        a.contentDocument.getElementById("aken").style.display = "block";

        akendeInfo2.querySelector(".ymbris").innerHTML = akendeInfo.querySelector(".ymbris").innerHTML
        akendeInfo2.querySelector(".ymbris").querySelector("ul").innerHTML+= document.querySelector("#akendenimekiri").innerHTML
        akendeInfo2.querySelectorAll("input").forEach(element => {element.outerHTML = ""});
	}

	function lisaUks(){
		ukseLaius = Number(prompt("Sisesta ukse laius (mm)"));
        if(ukseLaius == 0){alert("Mõõt ei saa võrduda 0-ga"); return};
		ukseKorgus = Number(prompt("Sisesta ukse kõrgus (mm)"));
        if(ukseKorgus == 0){alert("Mõõt ei saa võrduda 0-ga"); return}
		uksKogus = Number(prompt("Siseta kogus (tk)"));
        if(uksKogus == 0){alert("Mõõt ei saa võrduda 0-ga"); return}

		uksed.push([ukseLaius, ukseKorgus, uksKogus]);
		document.querySelector("#uksed").innerHTML = '<h3>Uksed:</h3><ul id="ustenimekiri"></ul><div id="lisaEemaldaUks"><input type="button" class="poolNuppu" value="Lisa uus" onClick="lisaUks();"></div>'
		document.querySelector("#lisaUksPea").style.display="none";
		for(var i=0; i<uksed.length; i++){
			document.querySelector("#ustenimekiri").innerHTML += "<li>Laius: "+uksed[i]["ukselaius"]+" mm; kõrgus: "+uksed[i]["uksekorgus"]+" mm; kogus: "+uksed[i]["kogus"]+" tk <input class='eemalda' type='button' value='-' onClick='eemaldaUks("+i+")'></li>";
		}
		uksedSum();
		if(document.querySelector("#arvutuseTulemused").clientHeight !== 0){
			arvutaUus()
		}
        if (joonestatud==true){joonestaUks2();}
	}
	
	function lisaAken(){
		akenLaius = Number(prompt("Sisesta akna laius (mm)"));
        if(akenLaius == 0){alert("Mõõt ei saa võrduda 0-ga"); return};
		akenKorgus = Number(prompt("Sisesta akna kõrgus (mm)"));
        if(akenKorgus == 0){alert("Mõõt ei saa võrduda 0-ga"); return};
        akenKogus = Number(prompt("Siseta kogus (tk)"));
        if(akenKogus == 0){alert("Mõõt ei saa võrduda 0-ga"); return}

		aknad.push([akenLaius, akenKorgus, akenKogus]);
        
		aknadSum();
		if(document.querySelector("#arvutuseTulemused").clientHeight !== 0){
			arvutaUus()
		}
    }
    


	function eemaldaUks(i){
		if(uksed.length == 1) {
        uksedSum();
        
        uksedArvutatud = false;
        usteSeeria = 0;
        document.querySelector("#uksed").innerHTML = "";
        uksed2Info.innerHTML = ""
		document.querySelector("#lisaUksPea").style.display="block";
		usteInfo = document.querySelector("#usteInfo");
		usteInfo2 = document.querySelector("#usteInfo2");
        usteInfo.querySelector(".ymbris").innerHTML ="";
        usteInfo2.querySelector(".ymbris").innerHTML ="";
		usteInfo.style.border = "none";
		usteInfo.style.borderRadius = "10px 0"
        usteInfo.style.height = "0";
        usteHindSalvestatud = false;
		usteInfo.style.transition = "height 0s";
		uksed.pop();
		uksedJooksvadMeetrid = 0;
        uksed = [];
        usteHinnad ="";
        arvutaUus();
        usteSummaKokku = 0;
        detailInfo();  
        if(joonestatud == true){joonesta()}
        a.contentDocument.getElementById("uks").style.display = "none";
        }else{
        uksed.splice(i,1);
        	
		document.querySelector("#ustenimekiri").innerHTML = "";
		for(var i=0; i<uksed.length; i++){
            document.querySelector("#ustenimekiri").innerHTML += "<li>Laius: "+uksed[i]["ukselaius"]+" mm; kõrgus: "+uksed[i]["uksekorgus"]+" mm; kogus: "+uksed[i]["kogus"]+" tk; sein: "+uksed[i]["missein"]+"; kaugus: "+uksed[i]["kaugus"]+" mm "+uksed[i]["kust"]+"<input class='eemalda' type='button' value='-' onClick='eemaldaUks("+i+")'></li>";
        }
        uksedSum();
        usteSeeriaFN();	
        arvutaUus();
        if(joonestatud == true){joonesta()}
	}
    }

	function eemaldaAken(i){
		if(aknad.length == 1) {
			aknadSum();
            aknadArvutatud = false;
            akendeSeeria = 0;
            document.querySelector("#aknad").innerHTML = "";
            aknad2Info.innerHTML="";
			document.querySelector("#lisaAkenPea").style.display="block";
            akendeInfo = document.querySelector("#aknadInfo");
            akendeInfo2 = document.querySelector("#aknadInfo2");
			akendeInfo.querySelector(".ymbris").innerHTML ="";
			akendeInfo2.querySelector(".ymbris").innerHTML ="";
			akendeInfo.style.border = "none";
			akendeInfo.style.borderRadius = "10px 0"
			akendeInfo.style.height = "0"; aknad
			akendeInfo.style.transition = "height 0s";
            aknad.pop();
            aknadJooksvadMeetrid = 0;
            usteHindSalvestatud = false;
            aknad = [];
            akendeHinnad ="";
            arvutaUus();
            akendeSummaKokku = 0;
            detailInfo();
            if(joonestatud == true){joonesta()}
            a.contentDocument.getElementById("aken").style.display = "none";
		}else{
            aknad.splice(i,1);
			document.querySelector("#akendenimekiri").innerHTML = "";
			for(var i=0; i<aknad.length; i++){
                if(aknad[i]["kaugus"] == "" || aknad[i]["kaugus"] == 0){
                    document.querySelector("#akendenimekiri").innerHTML += "<li>Laius: "+aknad[i]["laius"]+" mm; kõrgus: "+aknad[i]["korgus"]+" mm; kogus: "+aknad[i]["kogus"]+" tk; sein: "+aknad[i]["sein"]+"; asub seina keskel<input class='eemalda' type='button' value='-' onClick='eemaldaAken("+i+")'></li>";
                }else{
                    document.querySelector("#akendenimekiri").innerHTML += "<li>Laius: "+aknad[i]["laius"]+" mm; kõrgus: "+aknad[i]["korgus"]+" mm; kogus: "+aknad[i]["kogus"]+" tk; sein: "+aknad[i]["sein"]+"; kaugus: "+aknad[i]["kaugus"]+" mm "+aknad[i]["pool"]+"<input class='eemalda' type='button' value='-' onClick='eemaldaAken("+i+")'></li>";
                }
                }
            aknadSum();
            akendeSeeriaFN()
			arvutaUus();
            if(joonestatud == true){joonesta()}
	}}

	function lisaPikemLaud(){
		pikemLaudPikkus = Number(prompt("Sisesta laua pikkus (mm) (Pikema laua mõõt on kogu seinapalgi pikkus + üleulatuv osa.) "));
        if(pikemLaudPikkus == 0){alert("Mõõt ei saa võrduda 0-ga"); return}
		pikemLaudKorgus = Number(prompt("Sisesta pikema laua kõrgus",Number(document.querySelector("#palgiKorgus").value)));
        if(pikemLaudKorgus == 0){alert("Mõõt ei saa võrduda 0-ga"); return}
		pikemLaudKogus = Number(prompt("Sisesta laudade kogus (tk)",2));
        if(pikemLaudKogus == 0){alert("Mõõt ei saa võrduda 0-ga"); return}

        pikemadLauad.push({pikkus: pikemLaudPikkus, korgus: pikemLaudKorgus, kogus: pikemLaudKogus});
        pikemLaudNimekiri()
		pikemLaudSum2();
        if(katusArvutatud == true){lisakatusKirjuta()};
		if(parlinArvutatud == true){lisaParlinKirjuta()};

        arvutaUus()
        
    }
    
    const pikemLaudNimekiri = () => {
        document.querySelector("#pikemadLauad").innerHTML = '<h3>Pikemad lauad:</h3><ul id="pikemateLaudadeNimekiri"></ul><div id="lisaEemaldapikemLaud"><input type="button" class="poolNuppu" value="Lisa uus" onClick="lisaPikemLaud();"></div>'
		document.querySelector("#lisaPikemLaudPea").style.display="none";
		for(var i=0; i<pikemadLauad.length; i++){
            document.querySelector("#pikemateLaudadeNimekiri").innerHTML += "<li>Pikkus: "+pikemadLauad[i]["pikkus"]+" mm; kõrgus: "+pikemadLauad[i]["korgus"]+" mm; kogus: "+pikemadLauad[i]["kogus"]+" tk<input type='button' class='eemalda' value='-' alt='Eemalda' onClick='eemaldaPikemLaud("+i+")'></li>";		}

    }

function eemaldaPikemLaud(i){
		if(pikemadLauad.length == 1) {
            pikemadLauadArvtatud = false;
            pikemadLauad.pop();
            pikemadLauadJooksvadMeetrid = 0;
            pikemadLauad114jm = 0;
            pikemadLauadLisaKulu = 0;
            pikemadLauadArv = 0;
            pikemLaudSum2();
            document.querySelector("#pikemadLauad").innerHTML = "";
            document.querySelector("#pikemadLauadInfo2").querySelector(".ymbris").innerHTML = ""
            if(parlinArvutatud == true){
                lisaParlinKirjuta();
            }
            if(katusArvutatud == true){
                lisakatusKirjuta();
            }
            document.querySelector("#lisaPikemLaudPea").style.display="block";
            pikemadLauadInfo = document.querySelector("#pikemadLauadInfo");
            pikemadLauadInfo.querySelector(".ymbris").innerHTML ="";
            pikemadLauadInfo.style.border = "none";
            pikemadLauadInfo.style.borderRadius = "10px 0"
            pikemadLauadInfo.style.height = "0";
            pikemadLauadInfo.style.transition = "height 0s";
            pikemadLauadArvtatud = false;
            arvutaUus();
            a.contentDocument.getElementById("pikemadlauad").style.display = "none";
		}else{
            pikemadLauad.splice(i,1);
            document.querySelector("#pikemateLaudadeNimekiri").innerHTML = "";
            for(var i=0; i<pikemadLauad.length; i++){
                document.querySelector("#pikemateLaudadeNimekiri").innerHTML += "<li>Pikkus: "+pikemadLauad[i]["pikkus"]+" mm; kõrgus: "+pikemadLauad[i]["korgus"]+" mm; kogus: "+pikemadLauad[i]["kogus"]+" tk<input type='button' class='eemalda' value='-' onClick='eemaldaPikemLaud("+i+")'></li>";
            }
            pikemLaudSum2();
            arvutaUus();
            if(parlinLisatud == true){
                lisaParlinKirjuta();
            }
            if(katusLisatud == true){
                lisakatusKirjuta();
            }
        }
}

    function joonesta(fonditegur) {
        keskYParandus = 0;
        keskXParandus = 0;
        fondiTegur = 0;
        joonestatud = true;
        //fix_dpi();
        moodud();
        arvutaUus();
        arvuta2();
        if(width > depth){
            ratio = 1.2 * Math.ceil(width/canvas.width);	
        }else{
            ratio = 1.2 * Math.ceil(depth/canvas.width);
        }
        if(katusArvutatud == true){
            if(pikemadLauad.length > 0){
                katusePikkusJoonisel = Number(Math.max.apply(this, pikimLaud));
                katuseLaiusJoonisel = Number(katuseKolmnurgaAlus);
                //console.log("Katuse pikkus joonisel on "+katusePikkusJoonisel+" ja katuse laius "+katuseLaiusJoonisel+" katuse kolmnurga alus on: "+katuseKolmnurgaAlus)
               
                if(katusePikkusJoonisel > katuseLaiusJoonisel){
                    ratio = 1.4*Math.ceil(katusePikkusJoonisel/canvas.width);
                }else{
                    ratio = 1.4*Math.ceil(katuseLaiusJoonisel/canvas.width);
                }

            }else{
                if(viilKatus){
                    katusePikkusJoonisel = depth;
                    katuseLaiusJoonisel = Number(katuseKolmnurgaAlus);
                    //console.log("Katuse pikkus joonisel on "+katusePikkusJoonisel+" ja katuse laius "+katuseLaiusJoonisel+" katuse kolmnurga alus on: "+katuseKolmnurgaAlus)
                }else{
                    katusePikkusJoonisel = width;
                    katuseLaiusJoonisel = Number(katuseKolmnurgaAlus);
                    //console.log("Katuse pikkus joonisel on "+katusePikkusJoonisel+" ja katuse laius "+katuseLaiusJoonisel+" katuse kolmnurga alus on: "+katuseKolmnurgaAlus)
                }
                
                if(katusePikkusJoonisel > katuseLaiusJoonisel){
                    ratio = 1.4*Math.ceil(katusePikkusJoonisel/canvas.width);
                }else{
                    ratio = 1.4*Math.ceil(katuseLaiusJoonisel/canvas.width);                    
                
                    /* if(width > depth){
                        ratio = 1.2 * Math.ceil(width/canvas.width);	
                    }else{
                        ratio = 1.2 * Math.ceil(depth/canvas.width);
                    } */

                }   
            }}
        // if(ratio < 7){ratio = 6}
        if(fonditegur == "" || fonditegur == null){
            fondiTegur = Number(195/ratio);
            if(fondiTegur > 12.5){
                fondiTegur = 12.5
            }else{
                fondiTegur = 195/ratio;
            }
        }else{
            fondiTegurMaaratud = true;
            fondiTegur = fonditegur;
        }
        fontSize = fondiTegur+"px Verdana"
        
        //console.log("Fondi suurus ja tüüp on: "+fontSize)
        //console.log("Ratio on: "+ratio);
            pikkus =(width/ratio);
            laius = (depth/ratio);


            
        if(pikemadLauad.length > 0 && katus.length > 0 && viilKatus){
            keskYParandus = 0
            
                keskYParandus = Number(((katuseKolmnurgaAlus-100)/ratio)-pikkus)
                keskX = Number(canvas.width/2);
                keskY = Number(canvas.height/2)-keskYParandus/2;

        }else if((katuseLauaYleulatus > 0 || katuseLauaPikkus > 0) && katus.length > 0){
            keskYParandus = 0
            keskYParandus = Number(((katuseKolmnurgaAlus)/ratio)-laius)
            keskX = Number(canvas.width/2);
            keskY = Number(canvas.height/2)-keskYParandus/2;
        }else{
            keskX = Number(canvas.width/2);
            keskY = Number(canvas.height/2);
        }

        if((pikemadLauad.length > 0 || katuseLauaYleulatus > 0 || katuseLauaPikkus > 0) && katus.length > 0){
            console.groupCollapsed("Katuse joonestamine")
            //console.log("KeskYparandus", keskYParandus)
            //console.log("Katuse laius joonisel", (katuseLaiusJoonisel))
            //console.log("Katuse katuseKolmnurgaAlus", katuseKolmnurgaAlus)
            //console.log("katuse pikkus joonisel", katusePikkusJoonisel)
            //console.log("pikkus", pikkus)
            //console.log("laius", laius)
            console.groupEnd()
        }
        

        algusX1 = (keskX-(pikkus/2));
        algusY1 = (keskY-(laius/2));
		algusX2 = (keskX+(pikkus/2));
		algusY2 = (keskY+(laius/2));
        yleOsa = (100+palgiPaksus)/ratio;
        yleOsa2 = 10;
		
		//console.log("Originaal pikkus: "+width+", konverteeritud pikkus: "+pikkus);
		//console.log("Originaal laius: "+depth+", konverteeritud pikkus: "+laius);
		
		function joonestaPlaan() {
            let null2 = 0.2;
            let uks5 = 1.5;
            let uks2 = 1.2;
            if(fondiTegurMaaratud == true ){fondiTegur = 50; null2 = null2*4; uks5 = uks5*4; uks2 = uks2*4;} 
            c.clearRect(0,0,canvas.width,canvas.height);
            c.lineWidth=Number(palgiPaksus/ratio);
            c.strokeStyle = "black";
			c.beginPath();
			c.moveTo(algusX1, algusY1+yleOsa);
			c.lineTo(algusX1+pikkus, algusY1+yleOsa);//Ülemine joon
			c.moveTo(algusX2-yleOsa, algusY1);
			c.lineTo(algusX2-yleOsa, algusY1+laius);//Parem joon
            c.moveTo(algusX2, algusY2-yleOsa);
			c.lineTo(algusX2-pikkus, algusY2-yleOsa);//Alumione jonn
			c.moveTo(algusX1+yleOsa, algusY2);
			c.lineTo(algusX1+yleOsa, algusY1);//Vasak joon
			c.stroke()
			c.beginPath()
			//alumine mõõtjoon
			c.moveTo(algusX1, (algusY2+null2*yleOsa2)); //vasak alumine oblique
			c.lineTo(algusX1,(algusY2+uks5*yleOsa2)); //vasak alumine oblique
			c.moveTo(algusX1,(algusY2+uks2*yleOsa2))//alumine mõõtjoon
			c.lineTo(algusX2, (algusY2+uks2*yleOsa2));//alumine mõõtjoon
			c.moveTo(algusX2,(algusY2+null2*yleOsa2));//parem alumine mõõtjoon
			c.lineTo(algusX2,(algusY2+uks5*yleOsa2));//parem alumine mõõtjoon
			//parem mõõtjoon
			c.moveTo(algusX2+null2*yleOsa2,algusY2); //alumine parem oblique
			c.lineTo(algusX2+uks5*yleOsa2,algusY2); //alumine parem oblique
			c.moveTo(algusX2+uks2*yleOsa2,algusY2); //parem mõõtjoon
			c.lineTo(algusX2+uks2*yleOsa2,algusY1); //parem mõõtjoon
			c.moveTo(algusX2+null2*yleOsa2,algusY1) //ülemine parem oblique
			c.lineTo(algusX2+uks5*yleOsa2,algusY1); //ülemine parem oblique
            if(fondiTegurMaaratud == true){
                c.lineWidth = 1*4;
            }else{
                c.lineWidth = 1;
            }
			c.stroke(); 
            c.font = fontSize;
            c.textAlign = "center";
            c.textBaseline = "middle"
            
            c.fillText(Number(pindala).toFixed(2)+" m\u00B2",keskX,keskY);
            c.textBaseline = "bottom"
            if(fondiTegurMaaratud == true){
                c.fillText(width+" mm",(keskX),(algusY2+(fondiTegur/10*yleOsa2)));
            }else{
                c.fillText(width+" mm",(keskX),(algusY2+yleOsa2));
            }
            c.save();
            c.translate(0, canvas.height);
            c.rotate(-90*Math.PI/180);
            c.textBaseline = "bottom"
            if(pikemadLauad.length > 0 && katus.length > 0){
                if(fondiTegurMaaratud == true){
                    c.fillText(depth+" mm", (keskY+keskYParandus), algusX2+(fondiTegur/10*yleOsa2));
                }else{
                    c.fillText(depth+" mm", (keskY+keskYParandus), algusX2+yleOsa2);
                }
            }else{
                if(fondiTegurMaaratud == true){
                    c.fillText(depth+" mm", keskY, algusX2+(fondiTegur/10*yleOsa2));
                }else{
                    c.fillText(depth+" mm", keskY, algusX2+yleOsa2);
                }  
            }
			//c.fillRect(0,0,canvas.width, canvas.height);
			c.restore();
            //siit algavad tähed
            c.beginPath()
            if(fondiTegurMaaratud == true){
                c.lineWidth = 1*4;
            }else{
                c.lineWidth = 1;
            }
            c.textBaseline = "middle";
            c.fillText("A",algusX1+yleOsa,algusY1-uks5*yleOsa2)
            c.arc(algusX1+yleOsa,algusY1-uks5*yleOsa2, fondiTegur, 0, 2*Math.PI)
            //console.log("A fondiTegur on: "+fondiTegur)
            c.stroke();
            c.beginPath()
            c.fillText("B",algusX2-yleOsa,algusY1-uks5*yleOsa2)
            c.arc(algusX2-yleOsa,algusY1-uks5*yleOsa2, fondiTegur, 0, 2*Math.PI)
            c.stroke();
            c.beginPath()
            c.fillText("1",algusX1-uks5*yleOsa2,algusY2-yleOsa)
            c.arc(algusX1-uks5*yleOsa2,algusY2-yleOsa, fondiTegur, 0, 2*Math.PI)
            c.stroke();
            c.beginPath()
            c.fillText("2",algusX1-uks5*yleOsa2,algusY1+1*yleOsa)
            c.arc(algusX1-uks5*yleOsa2,algusY1+1*yleOsa, fondiTegur, 0, 2*Math.PI)
            c.stroke();
            //siin lõppevad tähed
            
            // siin algab katus
            if(katusArvutatud == true){
                c.beginPath();
                c.setLineDash([10,10]);
                c.strokeStyle = "grey"
                if(viilKatus){
                    if(pikemadLauad.length == 0){
                        c.strokeRect(algusX1+(yleOsa-palgiPaksus/ratio)-katuseLauaYleulatusJoonisel/ratio, algusY1,katuseKolmnurgaAlus/ratio, katusePikkusJoonisel/ratio)
                        c.moveTo(keskX,algusY1);
                        c.lineTo(keskX,algusY1+katusePikkusJoonisel/ratio);
                        //console.log(katuseLauaYleulatusJoonisel+" on katuseüleulatus")
                    }else{
                        c.strokeRect(algusX1+(yleOsa-palgiPaksus/ratio)-katuseLauaYleulatusJoonisel/ratio, algusY1+(yleOsa-palgiPaksus/ratio)-200/ratio,katuseKolmnurgaAlus/ratio, katusePikkusJoonisel/ratio)
                        c.moveTo(keskX,algusY1+(yleOsa-palgiPaksus/ratio)-200/ratio);
                        c.lineTo(keskX,(algusY1+(yleOsa-palgiPaksus/ratio)-200/ratio)+katusePikkusJoonisel/ratio);
                        //console.log(katuseLauaYleulatusJoonisel+" on katuseüleulatus")
                        //console.log("Katuse üleulatus tagant on "+Number(algusY1+(yleOsa-palgiPaksus/ratio)-200/ratio))
                       }
                }else{
                    if(pikemadLauad.length == 0){
                        c.strokeRect(algusX1, algusY1-100/ratio/* +(yleOsa-palgiPaksus/ratio)-katuseLauaYleulatusJoonisel/ratio */, katusePikkusJoonisel/ratio, katuseKolmnurgaAlus/ratio)
                        //console.log(katuseLauaYleulatusJoonisel+" on katuseüleulatus")
                    }else{
                        c.strokeRect(keskX-(katusePikkusJoonisel/2)/ratio,algusY1-100/ratio/* (yleOsa-palgiPaksus/ratio)-katuseLauaYleulatusJoonisel/ratio */, katusePikkusJoonisel/ratio, katuseKolmnurgaAlus/ratio ) //see 200 selle katuse puhul ei siia ei sobi.
                        //console.log(katuseLauaYleulatusJoonisel+" on katuseüleulatus")
                        //console.log(keskX-(katusePikkusJoonisel/2)/ratio+" katuse alguspunkt")
                    }
                }
                c.stroke();
                c.setLineDash([])
            } 
            //Siin lõppeb katus
            
        
        fondiTegurMaaratud = false;    
		}
        
        joonestaPlaan();
        if (uksed.length >0 ) {joonestaUks2();}
        if (aknad.length >0) {joonestaAken();}
//        window.addEventListener("scroll", joonesta());
}



        



    

    function oigeKorgus (nimi){
        if(nimi.style.height != "0px"){
            let uusKorgus = 0;
            uusKorgus = nimi.querySelector(".ymbris").clientHeight + 2*16;
            nimi.style.height = uusKorgus+"px";}

    }
function lisaUks2(){
    
    modalBody.innerHTML = ""
    modalPealkiri.innerHTML = "Lisa uus uks";
    modalBody.innerHTML = (
        '<h3>Ukse ava mõõdud:</h3>\
        <span><label for="ukseLaius">Ukse ava laius:</label><input type="number" id="ukseLaius" value="" autofocus> mm</span>\
        <span><label for="ukseKorgus">Ukse ava kõrgus:</label><input type="number" id="ukseKorgus" value=""> mm</span>\
        <span><label for="ukseKogus">Uste kogus:</label><input type="number" id="ukseKogus" value="" oninput="ukseKaugused()"> tk</span>\
        <h3>Ukse asukoht:</h3>\
        <span class="info">Kui kaugust pole määratud, siis paigutakse uks keskele</span>\
        <div class="ukseMoodud">\</div>\
		<input id="salvestaUks" type="button" class="poolNuppu" value="Salvesta uks" onClick="lisaUks3()">')
    modal.style.display = "block";
    document.querySelector("#ukseLaius").focus();
    var span = document.getElementsByClassName("close")[0];
    // When the user clicks on <span> (x), close the modal
    span.onclick = function() {
        modal.style.display = "none";
    }

    // When the user clicks anywhere outside of the modal, close it
    window.onclick = function(event) {
      if (event.target == modal) {
        modal.style.display = "none";
      }
        
    }
}
    function ukseKaugused(){
        ukseKogus = modalBody.querySelector("#ukseKogus");
		ukseMoodud = modalBody.querySelector(".ukseMoodud");
		if(ukseKogus.value > 1){
			modalBody.querySelector("#salvestaUks").value = "Salvesta uksed";
		}else{
			modalBody.querySelector("#salvestaUks").value = "Salvesta uks";
		}
        if (ukseKogus.value >= 1){
            ukseMoodud.innerHTML = "";
            
            for(i=0; i<ukseKogus.value; i++)
                ukseMoodud.innerHTML += (
                '<h4>Uks '+(i+1)+'.</h4>\
                <span><label for="misSein">Mis seinas uks asub:</label>\
                <select id="misSein'+i+'" name="misSein" onChange="poolteValik('+i+')">\
                    <option value="1">1</option>\
                    <option value="2">2</option>\
                    <option value="A">A</option>\
                    <option value="B">B</option>\
                </select>\
            </span>\
            <span><label for="paremVasak">Kaugus vasakult või paremalt:</label>\
                <select id="paremVasak'+i+'" name="paremVasak" style="width: 122px">\
                    <option value="vasakult">vasakult</option>\
                    <option value="paremalt">paremalt</option>\
                </select>\
            </span>\
        <p><span><label for="kaugusPunktist">Kaugus valitud poolelt mõõdupunktini</label><input type="number" id="kaugusPunktist'+i+'" value=""> mm</span></p>')

        }
    }
    function poolteValik(i){
        // for(i=0; i<milleKogus.value; i++){
        // if(modalBody.querySelector('#misSein'+i).value == "1" || modalBody.querySelector('#misSein'+i).value == "2"){
        //     modalBody.querySelector("#paremVasak"+i).innerHTML = (
        //             '<option value="vasakult">vasakult</option>\
        //             <option value="paremalt">paremalt</option>')
        // }else{
        //     modalBody.querySelector("#paremVasak"+i).innerHTML = (
        //             '<option value="vasakult">vasakult (ülevalt)</option>\
        //             <option value="paremalt">paremalt (alt)</option>')
        // }
        // modalBody.querySelector("#paremVasak"+i).style.width = "122px";
        // }

        if(modalBody.querySelector('#misSein'+i).value == "1" || modalBody.querySelector('#misSein'+i).value == "2"){
            modalBody.querySelector("#paremVasak"+i).innerHTML = (
                            '<option value="vasakult">vasakult</option>\
                            <option value="paremalt">paremalt</option>')
        }else{
            modalBody.querySelector("#paremVasak"+i).innerHTML = (
                            '<option value="vasakult">vasakult (ülevalt)</option>\
                            <option value="paremalt">paremalt (alt)</option>')
        }
        modalBody.querySelector("#paremVasak"+i).style.width = "122px";
    }

function lisaAken2(){
    
    modalBody.innerHTML = ""
    modalPealkiri.innerHTML = "Lisa uus aken";
    modalBody.innerHTML = (
        '<h3>Akna ava mõõdud:</h3>\
        <span><label for="aknaLaius">Akna ava laius:</label><input type="number" id="aknaLaius" value="" autofocus> mm</span>\
            <span><label for="aknaKorgus">Akna ava kõrgus:</label><input type="number" id="aknaKorgus" value=""> mm</span>\
            <span><label for="aknaKogus">Akende kogus:</label><input type="number" id="aknaKogus" oninput="aknaKaugused()" value=""> tk</span>\
        <h3>Akna asukoht:</h3>\
        <span class="info">Kui kaugust pole määratud, siis paigutakse aken keskele</span>\
        <div class="aknaMoodud">\
        </div>\
        <input id="salvestaAken" type="button" class="poolNuppu" value="Salvesta aken" onClick="lisaAken3()">')
    modal.style.display = "block";
    document.querySelector("#aknaLaius").focus();
    var span = document.getElementsByClassName("close")[0];
    // When the user clicks on <span> (x), close the modal
    span.onclick = function() {
        modal.style.display = "none";
    }

    // When the user clicks anywhere outside of the modal, close it
    window.onclick = function(event) {
      if (event.target == modal) {
        modal.style.display = "none";
      }
    }

}
    function aknaKaugused(){
        aknaKogus = modalBody.querySelector("#aknaKogus");
		aknaMoodud = modalBody.querySelector(".aknaMoodud");
		if(aknaKogus.value > 1){
			modalBody.querySelector("#salvestaAken").value = "Salvesta aknad";
		}else{
			modalBody.querySelector("#salvestaAken").value = "Salvesta aken";
		}
        if (aknaKogus.value >= 1){
            aknaMoodud.innerHTML = "";
            
            for(i=0; i<aknaKogus.value; i++)
                aknaMoodud.innerHTML += (
                '<h4>Aken '+(i+1)+'.</h4>\
                <span><label for="misSein">Mis seinas aken asub:</label>\
                <select id="misSein'+i+'" name="misSein" onChange="poolteValik('+i+')">\
                    <option value="1">1</option>\
                    <option value="2">2</option>\
                    <option value="A">A</option>\
                    <option value="B">B</option>\
                </select>\
            </span>\
            <span><label for="paremVasak">Kaugus vasakult või paremalt:</label>\
                <select id="paremVasak'+i+'" name="paremVasak" style="width: 122px">\
                    <option value="vasakult">vasakult</option>\
                    <option value="paremalt">paremalt</option>\
                </select>\
            </span>\
        <p><span><label for="kaugusPunktist">Kaugus vastavalt poolelt:</label><input type="number" id="kaugusPunktist'+i+'" value=""> mm</span></p>')
        }
    }


	function lisaUks3(){
        moodud();
		//uksedKokkuPindala = 0;
        modal.style.display = "none";
		ukseLaius = Number(modalBody.querySelector("#ukseLaius").value);
        if(ukseLaius == 0){alert("Mõõt ei saa võrduda 0-ga"); return};
		ukseKorgus = Number(modalBody.querySelector("#ukseKorgus").value);
        if(ukseKorgus == 0){alert("Mõõt ei saa võrduda 0-ga"); return}
		ukseKogus = Number(modalBody.querySelector("#ukseKogus").value);
        if(ukseKogus == 0){alert("Mõõt ei saa võrduda 0-ga"); return}

        usteSeeriaFN()

        

        for(j=0; j<ukseKogus; j++){
            uksed.push({ukselaius: ukseLaius, uksekorgus: ukseKorgus, kogus: 1, missein: modalBody.querySelector("#misSein"+j).value, kust:modalBody.querySelector("#paremVasak"+j).value, kaugus:modalBody.querySelector("#kaugusPunktist"+j).value, seeria: usteSeeria});
          }

        usteNimekiri()
		uksedSum();
		arvutaUus()
		
        if(joonestatud == true){joonesta()}
    }

    const usteNimekiri = () =>{
        document.querySelector("#uksed").innerHTML = '<h3>Uksed:</h3><ul id="ustenimekiri"></ul><div id="lisaEemaldaUks"><input type="button" class="poolNuppu" value="Lisa uus" onClick="lisaUks2();"></div>'
		document.querySelector("#lisaUksPea").style.display="none";
		for(var i=0; i<uksed.length; i++){
            if(uksed[i]["kaugus"] == "" || uksed[i]["kaugus"] == 0){
                document.querySelector("#ustenimekiri").innerHTML += "<li>Laius: "+uksed[i]["ukselaius"]+" mm; kõrgus: "+uksed[i]["uksekorgus"]+" mm; kogus: "+uksed[i]["kogus"]+" tk; sein: "+uksed[i]["missein"]+"; asub seina keskel<input class='eemalda' type='button' value='-' onClick='eemaldaUks("+i+")'></li>";
            }else{
                document.querySelector("#ustenimekiri").innerHTML += "<li>Laius: "+uksed[i]["ukselaius"]+" mm; kõrgus: "+uksed[i]["uksekorgus"]+" mm; kogus: "+uksed[i]["kogus"]+" tk; sein: "+uksed[i]["missein"]+"; kaugus: "+uksed[i]["kaugus"]+" mm "+uksed[i]["kust"]+"<input class='eemalda' type='button' value='-' onClick='eemaldaUks("+i+")'></li>";
            }
		}
    }
    
    const usteSeeriaFN = () => {
        var tempUsteSeeria = false;
        if(distinctSeeriaUks.length == 0){
            usteSeeria = 0;
        }else{
            usteSeeria = distinctSeeriaUks[distinctSeeriaUks.length - 1]
        }
        
        
        if(uksed.length == 0){
            usteSeeria = 0;
        }else{
            for(i=0; i<uksed.length; i++){
                if(ukseLaius == uksed[i]["ukselaius"] && ukseKorgus == uksed[i]["uksekorgus"]){
                    //console.log("Leidsin sarnase! Leitud ukse seeria on "+Number(uksed[i]["seeria"]))
                    usteSeeria = Number(uksed[i]["seeria"])
                    tempUsteSeeria = true;
                }

                }
            if(tempUsteSeeria == false){
                usteSeeria+=1
            }
        }

    }

    function lisaAken3(){
        moodud();
        modal.style.display = "none";
		akenLaius = Number(modalBody.querySelector("#aknaLaius").value);
        if(akenLaius == 0){alert("Mõõt ei saa võrduda 0-ga"); return};
		akenKorgus = Number(modalBody.querySelector("#aknaKorgus").value);
        if(akenKorgus == 0){alert("Mõõt ei saa võrduda 0-ga"); return}
		akenKogus = Number(modalBody.querySelector("#aknaKogus").value);
        if(akenKogus == 0){alert("Mõõt ei saa võrduda 0-ga"); return}

        akendeSeeriaFN()
        //akendeSeeria = akendeSeeria+1;
        for(j=0; j<akenKogus; j++){

		      aknad.push({laius: akenLaius, korgus:akenKorgus, kogus: 1, sein: modalBody.querySelector("#misSein"+j).value, pool: modalBody.querySelector("#paremVasak"+j).value, kaugus: modalBody.querySelector("#kaugusPunktist"+j).value, seeria: akendeSeeria});
            }
		aknadNimekiri()
		aknadSum();
		if(document.querySelector("#arvutuseTulemused").clientHeight !== 0){
			arvutaUus()
		}
        if(joonestatud == true){joonesta()}

    }

    const aknadNimekiri = () => {
        document.querySelector("#aknad").innerHTML = '<h3>Aknad:</h3><ul id="akendenimekiri"></ul><div id="lisaEemaldaAken"><input type="button" class="poolNuppu" value="Lisa uus" onClick="lisaAken2();"></div>'
		document.querySelector("#lisaAkenPea").style.display="none";
		for(var i=0; i<aknad.length; i++){
            if(aknad[i]["kaugus"] == "" || aknad[i]["kaugus"] == 0){
                document.querySelector("#akendenimekiri").innerHTML += "<li>Laius: "+aknad[i]["laius"]+" mm; kõrgus: "+aknad[i]["korgus"]+" mm; kogus: "+aknad[i]["kogus"]+" tk; sein: "+aknad[i]["sein"]+"; asub seina keskel<input class='eemalda' type='button' value='-' onClick='eemaldaAken("+i+")'></li>";
            }else{
                document.querySelector("#akendenimekiri").innerHTML += "<li>Laius: "+aknad[i]["laius"]+" mm; kõrgus: "+aknad[i]["korgus"]+" mm; kogus: "+aknad[i]["kogus"]+" tk; sein: "+aknad[i]["sein"]+"; kaugus: "+aknad[i]["kaugus"]+" mm "+aknad[i]["pool"]+"<input class='eemalda' type='button' value='-' onClick='eemaldaAken("+i+")'></li>";
            }
        }
    }

const akendeSeeriaFN = () => {
    var tempAkendeSeeria = false;

    if(distinctSeeriaAken == 0){
        akendeSeeria = 0
    }else{
        akendeSeeria = distinctSeeriaAken[distinctSeeriaAken.length-1]
    }
        
    if(aknad.length == 0){
        akendeSeeria = 0;
    }else{
        for(i=0; i<aknad.length; i++){
            if(akenLaius == aknad[i]["laius"] && akenKorgus == aknad[i]["korgus"]){
                //console.log("Leidsin sarnase! Leitud akna seeria on "+Number(aknad[i]["seeria"]))
                akendeSeeria = Number(aknad[i]["seeria"])
                tempAkendeSeeria = true;
            }

            }
        if(tempAkendeSeeria == false){
            akendeSeeria+=1
        }
    }
}

function joonestaAken() {

        for(var i = 0; i<aknad.length; i++){

            aknaLaius = aknad[i]["laius"]/ratio;
                                   
            if(aknad[i]["sein"] == 1){
                if (aknad[i]["kaugus"] == 0){x1 = keskX-aknaLaius/2}else{
                    if(aknad[i]["pool"] == "vasakult"){
                        x1 = (algusX1)+aknad[i]["kaugus"]/ratio }else{
                        x1 = (algusX2)-aknad[i]["kaugus"]/ratio-aknaLaius;
                    }}       
                    y1 = algusY2-yleOsa;
                //x2 = x1+aknaLaius*Math.cos(radiaan);
                //y2 = y1+aknaLaius*Math.sin(radiaan);
                c.textBaseline = "bottom"
                //uks ise
                c.beginPath()
                c.moveTo(x1,y1);
                //alert("Liigu punkti kordinaatidega: "+x1+", "+y1); 
                //alert("Joon punktiini: "+x2+", "+y2);
                c.lineTo(x1+aknaLaius, y1);
                //alert("Uks joonestatud");
                c.lineWidth = Number(palgiPaksus/ratio);
                c.strokeStyle = "blue";
                c.stroke();
                //ukse mõõt
                c.beginPath()
                //c.clearRect(x1,y1-(1.1*Number(palgiPaksus/ratio)/2),ukselaius,(Number(palgiPaksus/ratio)));
                c.moveTo(x1,y1-0.2*yleOsa);
                c.lineTo(x1, y1-yleOsa);
                c.moveTo(x1+aknaLaius, y1-0.2*yleOsa);
                c.lineTo(x1+aknaLaius, y1-yleOsa);
                c.moveTo(x1, y1-0.7*yleOsa);
                c.lineTo(x1+aknaLaius, y1-0.7*yleOsa);
                c.lineWidth = 1;
                c.stroke()
                c.font = fontSize;
                c.textAlign = "center";
                c.fillText(aknad[i]["laius"]+" mm",x1+(aknaLaius/2),y1-0.9*yleOsa);
            }
            
            if(aknad[i]["sein"] == 2){
                if (aknad[i]["kaugus"] == 0){x1 = keskX-aknaLaius/2}else{
                    if(aknad[i]["pool"] == "vasakult"){
                        x1 = (algusX1)+aknad[i]["kaugus"]/ratio }else{
                        x1 = (algusX2)-aknad[i]["kaugus"]/ratio-aknaLaius;
                    }}       
                    y1 = algusY1+yleOsa;
                //x2 = x1+aknaLaius*Math.cos(radiaan);
                //y2 = y1+aknaLaius*Math.sin(radiaan);
                c.textBaseline = "top"
                //uks ise
                c.beginPath()
                c.moveTo(x1,y1);
                //alert("Liigu punkti kordinaatidega: "+x1+", "+y1); 
                //alert("Joon punktiini: "+x2+", "+y2);
                c.lineTo(x1+aknaLaius, y1);
                //alert("Uks joonestatud");
                c.lineWidth = Number(palgiPaksus/ratio);
                c.strokeStyle = "blue";
                c.stroke();
                //ukse mõõt
                c.beginPath()
                //c.clearRect(x1,y1-(1.1*Number(palgiPaksus/ratio)/2),ukselaius,(Number(palgiPaksus/ratio)));
                c.moveTo(x1,y1+0.2*yleOsa);
                c.lineTo(x1, y1+yleOsa);
                c.moveTo(x1+aknaLaius, y1+0.2*yleOsa);
                c.lineTo(x1+aknaLaius, y1+yleOsa);
                c.moveTo(x1, y1+0.7*yleOsa);
                c.lineTo(x1+aknaLaius, y1+0.7*yleOsa);
                c.lineWidth = 1;
                c.stroke()
                c.font = fontSize;
                c.textAlign = "center";
                c.fillText(aknad[i]["laius"]+" mm",x1+(aknaLaius/2),y1+1*yleOsa);
            }
            
            if(aknad[i]["sein"] == "A"){
                if (aknad[i]["kaugus"] == 0){y1 = keskY-aknaLaius/2; y1a = keskY+aknaLaius/2}else{
                    if(aknad[i]["pool"] == "vasakult"){
                        y1 = (algusY1)+aknad[i]["kaugus"]/ratio;
                        y1a = (algusY2-aknad[i]["kaugus"]/ratio) }else{
                        y1 = (algusY2)-aknad[i]["kaugus"]/ratio-aknaLaius;
                        y1a = (algusY1)+aknad[i]["kaugus"]/ratio+aknaLaius;
                    }}       
                    x1 = algusX1+yleOsa;
                //x2 = x1+aknaLaius*Math.cos(radiaan);
                //y2 = y1+aknaLaius*Math.sin(radiaan);
                c.textBaseline = "top"
                //uks ise
                c.beginPath()
                c.moveTo(x1,y1);
                //alert("Liigu punkti kordinaatidega: "+x1+", "+y1); 
                //alert("Joon punktiini: "+x2+", "+y2);
                c.lineTo(x1, y1+aknaLaius);
                //alert("Uks joonestatud");
                c.lineWidth = Number(palgiPaksus/ratio);
                c.strokeStyle = "blue";
                c.stroke();
                //ukse mõõt
                c.beginPath()
                //c.clearRect(x1,y1-(1.1*Number(palgiPaksus/ratio)/2),ukselaius,(Number(palgiPaksus/ratio)));
                c.moveTo(x1+0.2*yleOsa, y1);
                c.lineTo(x1+yleOsa, y1);
                c.moveTo(x1+0.2*yleOsa, y1+aknaLaius);
                c.lineTo(x1+yleOsa, y1+aknaLaius);
                c.moveTo(x1+0.7*yleOsa, y1);
                c.lineTo(x1+0.7*yleOsa, y1+aknaLaius);
                c.lineWidth = 1;
                c.stroke();
                c.save();
                c.translate(canvas.height/2, canvas.height/2);
                c.rotate(-90*Math.PI/180);
                c.translate(-canvas.height/2, -canvas.height/2)
                c.font = fontSize;
                c.textAlign = "center"; 
                c.fillText(aknad[i]["laius"]+" mm",y1a+keskYParandus-aknaLaius/2, algusX1+2*yleOsa);
                c.restore();


            }
            if(aknad[i]["sein"] == "B"){
                if (aknad[i]["kaugus"] == 0){y1 = keskY-aknaLaius/2; y1a = keskY+aknaLaius/2}else{
                    if(aknad[i]["pool"] == "vasakult"){
                        y1 = (algusY1)+aknad[i]["kaugus"]/ratio;
                        y1a = (algusY2-aknad[i]["kaugus"]/ratio) }else{
                        y1 = (algusY2)-aknad[i]["kaugus"]/ratio-aknaLaius;
                        y1a = (algusY1)+aknad[i]["kaugus"]/ratio+aknaLaius;
                    }}       
                    x1 = algusX2-yleOsa;
                //x2 = x1+aknaLaius*Math.cos(radiaan);
                //y2 = y1+aknaLaius*Math.sin(radiaan);
                c.textBaseline = "bottom"
                //uks ise
                c.beginPath()
                c.moveTo(x1,y1);
                //alert("Liigu punkti kordinaatidega: "+x1+", "+y1); 
                //alert("Joon punktiini: "+x2+", "+y2);
                c.lineTo(x1, y1+aknaLaius);
                //alert("Uks joonestatud");
                c.lineWidth = Number(palgiPaksus/ratio);
                c.strokeStyle = "blue";
                c.stroke();
                //ukse mõõt
                c.beginPath()
                //c.clearRect(x1,y1-(1.1*Number(palgiPaksus/ratio)/2),ukselaius,(Number(palgiPaksus/ratio)));
                c.moveTo(x1-0.2*yleOsa, y1);
                c.lineTo(x1-yleOsa, y1);
                c.moveTo(x1-0.2*yleOsa, y1+aknaLaius);
                c.lineTo(x1-yleOsa, y1+aknaLaius);
                c.moveTo(x1-0.7*yleOsa, y1);
                c.lineTo(x1-0.7*yleOsa, y1+aknaLaius);
                c.lineWidth = 1;
                c.stroke();
                c.save();
                c.translate(canvas.height/2, canvas.height/2);
                c.rotate(-90*Math.PI/180);
                c.translate(-canvas.height/2, -canvas.height/2)
                c.font = fontSize;
                c.textAlign = "center"; 
                c.fillText(aknad[i]["laius"]+" mm",y1a+keskYParandus-aknaLaius/2, algusX2-2*yleOsa);
                c.restore();
            }
        }
}
function joonestaUks2() {
    for(var i = 0; i<uksed.length; i++){

        ukseLaius = uksed[i]["ukselaius"]/ratio;
        //console.log("ukselaius", ukseLaius)
        
        if(uksed[i]["missein"] == "1"){
            //console.log("Sein 1")
            nurk = 8;
            radiaan = Math.PI * nurk/180.0;
            if (uksed[i]["kaugus"] == 0){x1 = keskX-ukseLaius/2;}else{
            if(uksed[i]["kust"] == "vasakult"){
                x1 = (algusX1)+uksed[i]["kaugus"]/ratio}else{
                x1 = (algusX2)-uksed[i]["kaugus"]/ratio-ukseLaius;
                    }}       
                y1 = algusY2-yleOsa;
                c.textBaseline = "bottom"
                //uks ise
                c.beginPath()
                c.moveTo(x1,y1);
                //alert("Liigu punkti kordinaatidega: "+x1+", "+y1); 
                //alert("Joon punktiini: "+x2+", "+y2);
                c.lineTo(x1+ukseLaius*Math.cos(radiaan),y1+ukseLaius*Math.sin(radiaan));
                //alert("Uks joonestatud");
                c.lineWidth = Number(palgiPaksus/ratio);
                c.strokeStyle = "green";
                c.stroke();
                //ukse mõõt
                c.beginPath()
                //c.clearRect(x1,y1-(1.1*Number(palgiPaksus/ratio)/2),ukselaius,(Number(palgiPaksus/ratio)));
                c.moveTo(x1,y1-0.2*yleOsa);
                c.lineTo(x1, y1-yleOsa);
                c.moveTo(x1+ukseLaius, y1-0.2*yleOsa);
                c.lineTo(x1+ukseLaius, y1-yleOsa);
                c.moveTo(x1, y1-0.7*yleOsa);
                c.lineTo(x1+ukseLaius, y1-0.7*yleOsa);
                c.lineWidth = 1;
                c.stroke()
                c.font = fontSize;
                c.textAlign = "center";
                c.fillText(uksed[i]["ukselaius"]+" mm",x1+ukseLaius/2,y1-0.9*yleOsa);
         }
        if(uksed[i]["missein"] == "2"){
            //console.log("Sein 2")
            nurk = -8;
            radiaan = Math.PI * nurk/180.0;
            if (uksed[i]["kaugus"] == 0){x1 = keskX-ukseLaius/2;}else{
            if(uksed[i]["kust"] == "vasakult"){
                x1 = (algusX1)+uksed[i]["kaugus"]/ratio}else{
                x1 = (algusX2)-uksed[i]["kaugus"]/ratio-ukseLaius;
                    }}       
                y1 = algusY1+yleOsa;
                c.textBaseline = "top"
                //uks ise
                c.beginPath()
                c.moveTo(x1,y1);
                //alert("Liigu punkti kordinaatidega: "+x1+", "+y1); 
                //alert("Joon punktiini: "+x2+", "+y2);
                c.lineTo(x1+ukseLaius*Math.cos(radiaan),y1+ukseLaius*Math.sin(radiaan));
                //alert("Uks joonestatud");
                c.lineWidth = Number(palgiPaksus/ratio);
                c.strokeStyle = "green";
                c.stroke();
                //ukse mõõt
                c.beginPath()
                //c.clearRect(x1,y1-(1.1*Number(palgiPaksus/ratio)/2),ukselaius,(Number(palgiPaksus/ratio)));
                c.moveTo(x1,y1+0.2*yleOsa);
                c.lineTo(x1, y1+yleOsa);
                c.moveTo(x1+ukseLaius, y1+0.2*yleOsa);
                c.lineTo(x1+ukseLaius, y1+yleOsa);
                c.moveTo(x1, y1+0.7*yleOsa);
                c.lineTo(x1+ukseLaius, y1+0.7*yleOsa);
                c.lineWidth = 1;
                c.stroke()
                c.font = fontSize;
                c.textAlign = "center";
                c.fillText(uksed[i]["ukselaius"]+" mm",x1+ukseLaius/2,y1+1*yleOsa);
         }
                if(uksed[i]["missein"] == "A"){
                    //console.log("Sein A")
                    nurk = 98;
                    radiaan = Math.PI * nurk/180.0;
                    if (uksed[i]["kaugus"] == 0){y1 = keskY-ukseLaius/2; y1a = keskY+ukseLaius/2}else{
                        if(uksed[i]["kust"] == "vasakult"){
                            y1 = (algusY1)+uksed[i]["kaugus"]/ratio;
                            y1a = (algusY2-uksed[i]["kaugus"]/ratio) }else{
                            y1 = (algusY2)-uksed[i]["kaugus"]/ratio-ukseLaius;
                            y1a = (algusY1)+uksed[i]["kaugus"]/ratio+ukseLaius;
                        }}       
                        x1 = algusX1+yleOsa;
                    //x2 = x1+aknaLaius*Math.cos(radiaan);
                    //y2 = y1+aknaLaius*Math.sin(radiaan);
                    c.textBaseline = "top"
                    //uks ise
                    c.beginPath()
                    c.moveTo(x1,y1);
                    //alert("Liigu punkti kordinaatidega: "+x1+", "+y1); 
                    //alert("Joon punktiini: "+x2+", "+y2);
                    c.lineTo(x1+ukseLaius*Math.cos(radiaan),y1+ukseLaius*Math.sin(radiaan));
                    //alert("Uks joonestatud");
                    c.lineWidth = Number(palgiPaksus/ratio);
                    c.strokeStyle = "green";
                    c.stroke();
                    //ukse mõõt
                    c.beginPath()
                    //c.clearRect(x1,y1-(1.1*Number(palgiPaksus/ratio)/2),ukselaius,(Number(palgiPaksus/ratio)));
                    c.moveTo(x1+0.2*yleOsa, y1);
                    c.lineTo(x1+yleOsa, y1);
                    c.moveTo(x1+0.2*yleOsa, y1+ukseLaius);
                    c.lineTo(x1+yleOsa, y1+ukseLaius);
                    c.moveTo(x1+0.7*yleOsa, y1);
                    c.lineTo(x1+0.7*yleOsa, y1+ukseLaius);
                    c.lineWidth = 1;
                    c.stroke();
                    c.save();
                    c.translate(canvas.height/2, canvas.height/2);
                    c.rotate(-90*Math.PI/180);
                    c.translate(-canvas.height/2, -canvas.height/2)
                    c.font = fontSize;
                    c.textAlign = "center"; 
                    c.fillText(uksed[i]["ukselaius"]+" mm",y1a+keskYParandus-ukseLaius/2, algusX1+2*yleOsa);
                    c.restore();


            }
            if(uksed[i]["missein"] == "B"){
                //console.log("Sein B")
                nurk = 82;
                radiaan = Math.PI * nurk/180.0;

                if (uksed[i]["kaugus"] == 0){y1 = keskY-ukseLaius/2; y1a = keskY+ukseLaius/2}else{
                    if(uksed[i]["kust"] == "vasakult"){
                        y1 =(algusY1)+uksed[i]["kaugus"]/ratio;
                        y1a = (algusY2-uksed[i]["kaugus"]/ratio) }else{
                        y1 = (algusY2)-uksed[i]["kaugus"]/ratio-ukseLaius;
                        y1a = (algusY1)+uksed[i]["kaugus"]/ratio+ukseLaius;
                    }}       
                    x1 = algusX2-yleOsa;
                //x2 = x1+aknaLaius*Math.cos(radiaan);
                //y2 = y1+aknaLaius*Math.sin(radiaan);
                c.textBaseline = "bottom"
                //uks ise
                c.beginPath()
                c.moveTo(x1,y1);
                //alert("Liigu punkti kordinaatidega: "+x1+", "+y1); 
                //alert("Joon punktiini: "+x2+", "+y2);
                c.lineTo(x1+ukseLaius*Math.cos(radiaan),y1+ukseLaius*Math.sin(radiaan));
                //alert("Uks joonestatud");
                c.lineWidth = Number(palgiPaksus/ratio);
                c.strokeStyle = "green";
                c.stroke();
                //ukse mõõt
                c.beginPath()
                //c.clearRect(x1,y1-(1.1*Number(palgiPaksus/ratio)/2),ukselaius,(Number(palgiPaksus/ratio)));
                c.moveTo(x1-0.2*yleOsa, y1);
                c.lineTo(x1-yleOsa, y1);
                c.moveTo(x1-0.2*yleOsa, y1+ukseLaius);
                c.lineTo(x1-yleOsa, y1+ukseLaius);
                c.moveTo(x1-0.7*yleOsa, y1);
                c.lineTo(x1-0.7*yleOsa, y1+ukseLaius);
                c.lineWidth = 1;
                c.stroke();
                c.save();
                c.translate(canvas.height/2, canvas.height/2);
                c.rotate(-90*Math.PI/180);
                c.translate(-canvas.height/2, -canvas.height/2)
                c.font = fontSize;
                c.textAlign = "center"; 
                c.fillText(uksed[i]["ukselaius"]+" mm",y1a+keskYParandus-ukseLaius/2, algusX2-2*yleOsa);
                c.restore();
            }

    }

}

function lisaVundament(){
    vundamentLisatud = true;
    modalBody.innerHTML = ""
    modalPealkiri.innerHTML = "Lisa vundament";
    modalBody.innerHTML = (
        '<div class="tekstiOsa"><h3>Vundamendi info:</h3>\
        <p>Vundamendi prussi mõõdud</p>\
        <span><label for="prussiLaius">Prussi laius:</label><input type="number" id="prussiLaius" value="70"> mm</span>\
        <span><label for="prussiKorgus">Prussi kõrgus:</label><input type="number" id="prussiKorgus" value="40"> mm</span>\
        <p><span><label for="vundamendiRing">Vundamendi ring seinte all </label><input type="checkbox" id="vundamendiRing" name="vundamendiRing"></p>\
        <span><label id="suunaLabel" for="porandasuund">Põrandalaudade suund: </label><select id="porandaSuund" name="porandaSuund" onChange="setPorandaSuund()">\
        <option value="AB">A->B</option>\
        <option value="12">1->2</option>\
        </select></span></div>\
        <div id="abiJoonisDiv"><img id="abiJoonis" src="img/abijoonis'+porandaSuund+'.svg" alt="abijoonis"></div>\
        <p><input type="button" class="poolNuppu" value="Salvesta vundament" onClick="lisaPorandVundament()"></p>\
        <div class="tapsemadSeaded">...</div>');

      if(porandArvutatud == true){
        porandaSuundVarem = true;
        document.querySelector("#suunaLabel").style.color = "red";
        document.querySelector("#suunaLabel").style.fontWeight = "bold";
        document.querySelector(".tekstiOsa").innerHTML += '<p class="suunaInfo">Kasutatakse eelnevalt sisesatud põrandalaudade suunda</p>'
        modalBody.querySelector("#porandaSuund").value = porandaSuund;
    }  
        
    if(muudaVundamentRun == true){
        modalBody.querySelector("#porandaSuund").value = porandaSuund;
        modalBody.querySelector("#prussiKorgus").value = prussiKorgus;
        modalBody.querySelector("#prussiLaius").value = prussiLaius;
        modalBody.querySelector("#vundamendiRing").checked = vundamendiRing;

        }


    //täpsemad seaded
    modalBody.querySelector(".tapsemadSeaded").onclick = function tapsemadSeaded(){
        prussiKorgus = modalBody.querySelector("#prussiKorgus").value;
        prussiLaius = modalBody.querySelector("#prussiLaius").value;
        vundamendiRing = modalBody.querySelector("#vundamendiRing").checked;
        tapsemadSeadedAvatudVundament = true;
        tapsemadSeadedLahtiVundament = true;
        modalBody.innerHTML += '<div id="tapsemadSeaded"></div>'
        modalBody.querySelector("#tapsemadSeaded").innerHTML = (
            '<div class="ymbris"><p><span><label for="prussideArv">Prusside arv:</label><input type="number" id="prussideArv" value=""> tk</span></p>\
            <span><label for="prussiKaugusAB">Kaugus välisseinast A->B:</label><input type="number" id="prussiKaugusAB" value=""> mm</span>\
            <span><label for="prussiKaugus12">Kaugus välisseinast 1->2:</label><input type="number" id="prussiKaugus12" value=""> mm</span></div>'
        )

        modalBody.querySelector("#porandaSuund").value = porandaSuund;
        modalBody.querySelector("#prussiKorgus").value = prussiKorgus;
        modalBody.querySelector("#prussiLaius").value = prussiLaius;
        modalBody.querySelector("#vundamendiRing").checked = vundamendiRing;
        
        if(muudaVundamentRun == true){
            modalBody.querySelector("#prussideArv").value = prussideArvTapsem;
            //console.log("Täpsem arv on muudetud: prussideArvTapsem;")
            modalBody.querySelector("#prussiKaugusAB").value = prussiKaugusValisseinastAB;
            modalBody.querySelector("#prussiKaugus12").value = prussiKaugusValisseinast12;
        }
        modalBody.querySelector("#tapsemadSeaded").style.transition = "height 1s";
        modalBody.querySelector("#tapsemadSeaded").style.height = modalBody.querySelector(".ymbris").scrollHeight+20+"px"; 
    }

 
    modal.style.display = "block";
    var span = document.getElementsByClassName("close")[0];
    // When the user clicks on <span> (x), close the modal
    span.onclick = function() {
        modal.style.display = "none";
    }

    // When the user clicks anywhere outside of the modal, close it
    window.onclick = function(event) {
      if (event.target == modal) {
        modal.style.display = "none";
        }
    }
}

function tapsemadSeadedKorgus(){
    modalBody.querySelector("#tapsemadSeaded").style.height = modalBody.querySelector(".ymbris").scrollHeight+20+"px";
}

function setPorandaSuund() {
    porandaSuund = document.querySelector("#porandaSuund").value
    if(porandaSuundVarem == true){
    document.querySelector("#suunaLabel").style.color = "";
    document.querySelector("#suunaLabel").style.fontWeight = "normal";
    document.querySelector(".suunaInfo").outerHTML = ''
    }
    if(porandaSuund == "AB"){
        vundamendiSuund = "1->2"
        modalBody.querySelector("#abiJoonis").src = ("img/abijoonis"+porandaSuund+".svg");
    }else{
        vundamendiSuund = "A->B"
        modalBody.querySelector("#abiJoonis").src = "img/abijoonis"+porandaSuund+".svg";

    }
    porandaSuundVarem = false;
}

function muudaVundament(){
    muudaVundamentRun = true;
    prussiKorgus = vundament[0]["korgus"];
    prussiLaius = vundament[0]["laius"]
    vundamendiRing = vundament[0]["ring"]
    prussideArvTapsem = vundament[0]["arvtapsem"];
    prussiKaugusValisseinast12 = vundament[0]["kaugus12"];
    //console.log("Kaugus12 muuda vundamenti: " + prussiKaugusValisseinast12 )
    prussiKaugusValisseinastAB = vundament[0]["kaugusab"];
    //console.log("KaugusAB muuda vundamenti: " + prussiKaugusValisseinastAB )
    lisaVundament();
}

function vundamentKirjuta(){
    document.querySelector("#vundament").style.display ="block"
    vundamentArvutatud = true;
    muudaVundamentRun = false;
    tapsemadSeadedAvatudVundament = false;
    vundamendiPikkus = 0;
    if(porandaSuund == "AB"){
        if(vundamendiRing == false){
            vundamendiPikkus = Number((depth-2*prussiKaugusValisseinast12-200))
        }else{
            vundamendiPikkus = Number((depth-2*prussiKaugusValisseinast12-200-2*vundament[0]["laius"]))
        }
    }else{
        if(vundamendiRing == false){
            vundamendiPikkus = Number((width-2*prussiKaugusValisseinastAB-200))
        }else{
            vundamendiPikkus = Number((width-2*prussiKaugusValisseinastAB-200-2*vundament[0]["laius"]))
        }
    }
    vundamentInfo = document.querySelector("#vundamentInfo");
    let vundamentInfo2 = document.querySelector("#vundamentInfo2");
    vundamentInfo.querySelector(".ymbris").innerHTML = (
        "<ul>\
        </ul>");
    if(porandaSuund == "AB"){
        vundamentInfo.querySelector(".ymbris").querySelector("ul").innerHTML = (
        "<li>Vundamendi prusside arv on: "+prussideArv+" tk ("+vundamendiPikkus+" mm)</li>\
        <li>Vundamendi prusside kesktelgede vahe on: "+Number(prussideVahe).toFixed(0)+" mm</li>"
        )
    }else{
        vundamentInfo.querySelector(".ymbris").querySelector("ul").innerHTML = (
            "<li>Vundamendi prusside arv on: "+prussideArv+" tk ("+vundamendiPikkus+" mm)</li>\
            <li>Vundamendi prusside kesktelgede vahe on: "+Number(prussideVahe).toFixed(0)+" mm</li>"
            )
        }
        
    if(porandaSuund == "AB"){
        if(vundamendiRing == false){
            vundamendiKulu = Number(vundament[0]["arv"]*(depth-2*prussiKaugusValisseinast12-200)/1000).toFixed(2)
            vundamentInfo.querySelector(".ymbris").querySelector("ul").innerHTML += (
                "<li>Vundamendi kulu on: "+vundamendiKulu+" jm</li>")
        }else{
            vundamendiKulu = Number((vundament[0]["arv"]*(depth-2*prussiKaugusValisseinast12-200-2*vundament[0]["laius"])/1000)+2*(width-2*prussiKaugusValisseinastAB-200)/1000).toFixed(2)
            vundamentInfo.querySelector(".ymbris").querySelector("ul").innerHTML += (
                "<li>Lisaks 2 "+Number(width-2*prussiKaugusValisseinastAB-200)+" mm pikkust vundamendi ringi prussi\
                <li>Vundamendi kulu on: "+vundamendiKulu+" jm</li>")
        } 
    }else{
        if(vundamendiRing == false){
            vundamendiKulu = Number(vundament[0]["arv"]*(width-2*prussiKaugusValisseinastAB-200)/1000).toFixed(2);
            vundamentInfo.querySelector(".ymbris").querySelector("ul").innerHTML += (
                "<li>Vundamendi kulu on: "+vundamendiKulu+" jm</li>")
        }else{
            vundamendiKulu = Number((vundament[0]["arv"]*(width-2*prussiKaugusValisseinastAB-200-2*vundament[0]["laius"])/1000)+2*(depth-2*prussiKaugusValisseinast12-200)/1000).toFixed(2);
            vundamentInfo.querySelector(".ymbris").querySelector("ul").innerHTML += (
                "<li>Lisaks 2 "+Number(depth-2*prussiKaugusValisseinast12-200)+" mm pikkust vundamendi ringi prussi\
                <li>Vundamendi kulu on: "+vundamendiKulu+" jm</li>")
        }
    
    }
    if(vundamendiKulu>0){
       vundament2Info.innerHTML = "";
       vundament2Info.innerHTML = '<li><span class="esimenePool">Vundamendi prussid: </span><span class="teinePool">'+Number(vundamendiKulu).toFixed(2)+'</span> jm<span class="kolmasPool">'+Number(vundamendiKulu*hinnad.vundament).toFixed(2)+'</span> €</li>'
       vundmendiSummaKokku = Number(vundamendiKulu*hinnad.vundament);
    }
    vundamentInfo.style.transition = "height 1s";
    vundamentInfo.style.border = "3px solid #2d6870";
   // document.querySelector("#uksed").style.borderTop = "3px solid black";
    vundamentInfo.style.borderRadius = "10px 0"
    vundamentInfo.style.height = vundamentInfo.querySelector(".ymbris").clientHeight+32+"px";
    vundamentNimekiri()    
    arvutaUus()
    eemaldaNuppKorgus();
    detailInfo();
    a.contentDocument.getElementById("vundament").style.display = "block";
    vundamentInfo2.querySelector(".ymbris").innerHTML = vundamentInfo.querySelector(".ymbris").innerHTML
    vundamentInfo2.querySelector(".ymbris").querySelector("ul").innerHTML+= document.querySelector("#vundamentNimekiri").innerHTML
    vundamentInfo2.querySelectorAll("input").forEach(element => {element.outerHTML = ""});
    // detailInfo2();
}

const vundamentNimekiri = () => {
    document.querySelector("#vundament").innerHTML = '<h3>Vundament</h3><ul id="vundamentNimekiri"></ul><input type="button" class="poolNuppu" value="Muuda vundamenti" onClick="muudaVundament();">'
    document.querySelector("#lisaVundamentPea").style.display="none";
    if(vundamendiRing == false){
        document.querySelector("#vundamentNimekiri").innerHTML =  '<input class="eemaldaMitu" type="button" value="-" onClick="eemaldaVundament()"><li>Kasutakse vundamenti profiiliga '+vundament[0]["laius"]+'x'+vundament[0]["korgus"]+' mm</li><li>Vundamendi suund on '+vundamendiSuund+'</li>'
    }else{
        document.querySelector("#vundamentNimekiri").innerHTML =  '<input class="eemaldaMitu" type="button" value="-" onClick="eemaldaVundament()"><li>Kasutakse vundamenti profiiliga '+vundament[0]["laius"]+'x'+vundament[0]["korgus"]+' mm</li><li>Vundamendi suund on '+vundamendiSuund+'</li><li>Kasutatakse vundamendi ringi</li>'
    }
    if(prussiKaugusValisseinast12>0) {document.querySelector("#vundamentNimekiri").innerHTML += "<li>Prussi kaugus väliseinast suunal 1->2 on "+prussiKaugusValisseinast12+" mm </li>"}
    if(prussiKaugusValisseinastAB>0) {document.querySelector("#vundamentNimekiri").innerHTML += "<li>Prussi kaugus väliseinast suunal A->B on "+prussiKaugusValisseinastAB+" mm </li>"}
}

function eemaldaVundament(){
    tapsemadSeadedAvatudVundament = false;
    tapsemadSeadedLahtiVundament = false;
    vundamentArvutatud = false;
    vundamentLisatud = false;
    muudaVundamentRun = false;
    porandaSuundVarem = false;
    vundamendiKulu = 0;
    vundmendiSummaKokku = 0;
    if(porandArvutatud == false){porandaSuund = "AB";}
    prussiKorgus = 0;
    prussiLaius = 0;
    vundamendiRing = false;
    prussiKaugusValisseinast12 = 0;
    prussiKaugusValisseinastAB = 0;
    document.querySelector("#vundament").innerHTML = "";
    document.querySelector("#lisaVundamentPea").style.display="block";
    vundamentInfo = document.querySelector("#vundamentInfo");
    vundamentInfo2 = document.querySelector("#vundamentInfo2");
    vundamentInfo.querySelector(".ymbris").innerHTML ="";
    vundamentInfo2.querySelector(".ymbris").innerHTML ="";
    vundament2Info.innerHTML = ""
    vundamentInfo.style.border = "none";
    vundamentInfo.style.borderRadius = "10px 0"
    vundamentInfo.style.height = "0";
    vundamentInfo.style.transition = "height 0s";
    vundament.pop();
    if (arvutaTulemusedArvutatud == true){arvutaUus();}
    if(document.querySelector("#arvutuseTulemused").clientHeight !== 0){
        arvutaUus()
    }
    a.contentDocument.getElementById("vundament").style.display = "none";
}

function lisaPorand(){
    porandLisatud = true;
    modalBody.innerHTML = ""
    modalPealkiri.innerHTML = "Lisa põrand";
    modalBody.innerHTML = (
        '<div class="tekstiOsa"><h3>Põranda info:</h3>\
        <span><label for="porandaLauaLaius">Põranda laua laius</label><input type="number" id="porandaLauaLaius" value="110"></input></span>\
        <span><label id="suunaLabel" for="porandasuund">Põrandalaudade suund: </label><select id="porandaSuund" name="porandaSuund" onChange="setPorandaSuund()">\
        <option value="AB">A->B</option>\
        <option value="12">1->2</option>\
        </select></span></div>\
        <div id="abiJoonisDiv"><img id="abiJoonis" src="img/abijoonis'+porandaSuund+'.svg" alt="abijoonis"></div>\
        <p><input type="button" class="poolNuppu" value="Salvesta põrand" onClick="lisaPorandVundament()"></p>\
        <div class="tapsemadSeaded">...</div>')
       if(vundamentArvutatud == true){
            porandaSuundVarem = true;
            document.querySelector("#suunaLabel").style.color = "red";
            document.querySelector("#suunaLabel").style.fontWeight = "bold";
            document.querySelector(".tekstiOsa").innerHTML += '<p class="suunaInfo">Kasutatakse eelnevalt sisesatud põrandalaudade suunda</p>'
            modalBody.querySelector("#porandaSuund").value = porandaSuund;

        }
         

    if(muudaPorandRun == true){
        modalBody.querySelector("#porandaSuund").value = porandaSuund;
        modalBody.querySelector("#porandaLauaLaius").value = porandaLauaLaius;
    }
    


    //täpsemad seaded
    modalBody.querySelector(".tapsemadSeaded").onclick = function tapsemadSeaded(){
        tapsemadSeadedAvatudPorand = true;
        tapsemadSeadedLahtiPorand = true;
        porandaLauaLaius = modalBody.querySelector("#porandaLauaLaius").value;
        modalBody.innerHTML += '<div id="tapsemadSeaded"></div>'
        modalBody.querySelector("#tapsemadSeaded").innerHTML = (
            '<div class="ymbris"><span><label for="porandaKaugusSeinast">Kaugus seinast:</label><input type="number" id="porandaKaugusSeinast" value=""> mm</span></div>'
        )
        modalBody.querySelector("#porandaSuund").value = porandaSuund;
        modalBody.querySelector("#porandaLauaLaius").value = porandaLauaLaius;
        if(muudaPorandRun == true){
            modalBody.querySelector("#porandaKaugusSeinast").value = porandaKaugusSeinast;
        }
        modalBody.querySelector("#tapsemadSeaded").style.transition = "height 1s";
        modalBody.querySelector("#tapsemadSeaded").style.height = modalBody.querySelector(".ymbris").scrollHeight+20+"px"; 
     }
    modal.style.display = "block";
    var span = document.getElementsByClassName("close")[0];
    // When the user clicks on <span> (x), close the modal
    span.onclick = function() {
        modal.style.display = "none";
    }

    // When the user clicks anywhere outside of the modal, close it
    window.onclick = function(event) {
      if (event.target == modal) {
        modal.style.display = "none";
      }
    }

}

function porandKirjuta(){
    document.querySelector("#porand").style.display ="block"
    porandArvutatud = true;
    muudaPorandRun = false;
    tapsemadSeadedAvatudPorand = false;
    //vundamendiPikkus = 0;
    porandInfo = document.querySelector("#porandInfo");
    let porandInfo2 = document.querySelector("#porandInfo2");
    porandInfo.querySelector(".ymbris").innerHTML = (
        "<ul>\
        </ul>");
    if(porandaSuund == "AB"){
        porandaLaudadeArv = Number(Math.ceil((depth-200-2*palgiPaksus)/porandaLauaLaius)+1)
        porandaLauaPikkus = Number(width-200-2*palgiPaksus-porandaKaugusSeinast);
    }else{
        porandaLaudadeArv = Number(Math.ceil((width-200-2*palgiPaksus)/porandaLauaLaius)+1);
        porandaLauaPikkus = Number(depth-200-2*palgiPaksus-porandaKaugusSeinast);  
    }
    

    porandaLaudJm = Number(porandaLaudadeArv*porandaLauaPikkus)/1000;
    
    if(porandaSuund == "AB"){
        porandInfo.querySelector(".ymbris").querySelector("ul").innerHTML = (
        "<li>Põrandalaudade arv on: "+porandaLaudadeArv+" tk ("+Number(porandaLauaPikkus).toFixed(0)+" mm)</li>"
        )
    }else{
        porandInfo.querySelector(".ymbris").querySelector("ul").innerHTML = (
            "<li>Põrandalaudade arv on:  "+porandaLaudadeArv+" tk ("+Number(porandaLauaPikkus).toFixed(0)+" mm)</li>"
            )
        }
    porandInfo.querySelector(".ymbris").querySelector("ul").innerHTML += (
        "<li>Põrandalaudade kulu on "+Number(porandaLaudJm).toFixed(2)+" jm</li>"
    )
    if(porandaLaudJm > 0){
        porand2Info.innerHTML = "";
        porand2Info.innerHTML = '<li><span class="esimenePool">Põrandalauad: </span><span class="teinePool">'+Number(porandaLaudJm).toFixed(2)+'</span> jm<span class="kolmasPool">'+Number(porandaLaudJm*hinnad.porandaLauad).toFixed(2)+'</span> €</li>'
        porandaSummaKokku = Number(porandaLaudJm*hinnad.porandaLauad);
    }
    porandInfo.style.transition = "height 1s";
    porandInfo.style.border = "3px solid #2d6870";
   // document.querySelector("#uksed").style.borderTop = "3px solid black";
    porandInfo.style.borderRadius = "10px 0"
    porandInfo.style.height = porandInfo.querySelector(".ymbris").clientHeight+32+"px";

    porandNimekiri()    
    arvutaUus()
    eemaldaNuppKorgus();
    detailInfo();
    a.contentDocument.getElementById("porandalauad").style.display = "block";
    porandInfo2.querySelector(".ymbris").innerHTML = porandInfo.querySelector(".ymbris").innerHTML
    porandInfo2.querySelector(".ymbris").querySelector("ul").innerHTML+= document.querySelector("#porandNimekiri").innerHTML
    porandInfo2.querySelectorAll("input").forEach(element => {element.outerHTML = ""});
    // detailInfo2();
}

function eemaldaPorand(){
    tapsemadSeadedAvatudPorand = false;
    tapsemadSeadedLahtiPorand = false;
    porandArvutatud = false;
    porandLisatud = false;
    muudaPorandRun = false;
    porandaSuundVarem = false;
    if(vundamentArvutatud == false){porandaSuund = "AB";}
    porandaLauaLaius = 0;
    porandaLauaPikkus = 0;
    porandaLaudadeArv = 0;
    porandaLaudJm = 0;
    porandaSummaKokku = 0;
    porandaKaugusSeinast = 0;
    document.querySelector("#porand").innerHTML = "";
    document.querySelector("#lisaPorandPea").style.display="block";
    porandInfo = document.querySelector("#porandInfo");
    porandInfo.querySelector(".ymbris").innerHTML ="";
    porandInfo2 = document.querySelector("#porandInfo2");
    porandInfo2.querySelector(".ymbris").innerHTML ="";
    porand2Info.innerHTML = "";
    porandInfo.style.border = "none";
    porandInfo.style.borderRadius = "10px 0"
    porandInfo.style.height = "0";
    porandInfo.style.transition = "height 0s";
    porand.pop();
    if (arvutaTulemusedArvutatud == true){arvutaUus();}
    if(document.querySelector("#arvutuseTulemused").clientHeight !== 0){
        arvutaUus()
    }
    a.contentDocument.getElementById("porandalauad").style.display = "none";

}

const porandNimekiri = () => {
    document.querySelector("#porand").innerHTML = '<h3>Porand</h3><ul id="porandNimekiri"></ul><input type="button" class="poolNuppu" value="Muuda põrandat" onClick="muudaPorandat();">'
    document.querySelector("#lisaPorandPea").style.display="none";

    document.querySelector("#porandNimekiri").innerHTML =  '<input class="eemaldaMitu" type="button" value="-" onClick="eemaldaPorand()"><li>Kasutakse põrandalauda laiusega '+porand[0]["laius"]+' mm</li>'
    if(porandaKaugusSeinast>0) {
        document.querySelector("#porandNimekiri").innerHTML += (
            "<li>Põrandalaua otsa kaugus väliseinast on "+porandaKaugusSeinast+" mm </li>")
    }else{
        document.querySelector("#porandNimekiri").innerHTML += "<li>Põrandalaua pikkus on "+porandaLauaPikkus+" mm</li>"
    }
    if(porandaSuund == "AB"){
        document.querySelector("#porandNimekiri").innerHTML += "<li>Põrandalaudade suund on A->B</li>"
    }else{
        document.querySelector("#porandNimekiri").innerHTML += "<li>Põrandalaudade suund on 1->2</li>"
    }
}

function muudaPorandat(){
    muudaPorandRun = true;
    porandaLauaLaius = porand[0]["laius"];
    //porandaSuund = document.querySelector("#porandaSuund").value;
    if(tapsemadSeadedAvatudPorand == true){
        porandaKaugusSeinast = porand[0]["seinast"];
    }
    lisaPorand();
}

function lisaPorandVundament(){
    // Põranda ja vundamendi lisa"nimi"2 koos kutsumise kood. Kui toimib kustuta kommenataar ja lisaPorand2 ja lisaVundament2
    if (porandLisatud == true){
        modal.style.display = "none";
        moodud();
        if(porandArvutatud == false){porandaKaugusSeinast = 5;}
        /*porandaLauaLaius = 0;
        porandaLauaPikkus = 0; */
        if(porandArvutatud == true && muudaPorandRun == false){
            porandaLauaLaius = porand[0]["laius"];
            if(porandaKaugusSeinast > 0){
                porandaKaugusSeinast = porand[0]["seinast"]
            }
        }else{
            porandaLauaLaius = Number(modalBody.querySelector("#porandaLauaLaius").value)
        }
        
        if(tapsemadSeadedAvatudPorand == true){
            if(porandArvutatud == true && muudaPorandRun == false){
                porandaKaugusSeinast = porand[0]["seinast"]; //tseki seda ja põrandal ka!!!
            }else{
                porandaKaugusSeinast = Number(modalBody.querySelector("#porandaKaugusSeinast").value)
                }
            }
        
        var i=1;
        if(porandaSuund == "AB"){
            porandaLaudadeArv = Number(Math.ceil((depth-200-2*palgiPaksus)/porandaLauaLaius)+1)
            porandaLauaPikkus = Number(width-200-2*palgiPaksus-porandaKaugusSeinast);
        }else{
            porandaLaudadeArv = Number(Math.ceil((width-200-2*palgiPaksus)/porandaLauaLaius)+1);
            porandaLauaPikkus = Number(depth-200-2*palgiPaksus-porandaKaugusSeinast);  
        }
        
    
        porandaLaudJm = 0;
    
        //console.log("Põrandalaudade arv "+porandaLaudadeArv);
        //console.log("Põranda kaugus seinast "+porandaKaugusSeinast);
        //console.log("Põrandalaudade jooksvad meetrid "+porandaLaudJm+" jm");
        document.querySelector("#porand").innerHTML = '<h3>Porand</h3><ul id="porandNimekiri"></ul><input type="button" class="poolNuppu" value="Muuda põrandat" onClick="muudaPorandat();">'
        document.querySelector("#lisaPorandPea").style.display="none";
        if(muudaPorandRun == true) {porand.pop(); porandArvutatud = false;};
        if(porandArvutatud == false){ porand.push({laius: porandaLauaLaius, pikkus: porandaLauaPikkus, arv: porandaLaudadeArv, jm: porandaLaudJm, seinast: porandaKaugusSeinast});}
        tapsemadSeadedLahtiPorand = false;
        
        porandKirjuta(); 
    }

    if(vundamentLisatud == true){
        modal.style.display = "none";
        moodud();
              
        if(vundamentArvutatud == true && muudaVundamentRun == false){
            prussiH = vundament[0]["korgus"];
            prussiW = vundament[0]["laius"];
            vundamendiRing = vundament[0]["ring"];
        }else{
            prussiH = document.querySelector("#prussiKorgus").value;
            prussiW = document.querySelector("#prussiLaius").value;
            vundamendiRing = document.querySelector("#vundamendiRing").checked;

        }
        /* prussideArv = 0;
        prussideVahe = 0;
        prussiKaugusValisseinast12 = 0;
        prussiKaugusValisseinastAB = 0; */
        if(tapsemadSeadedAvatudVundament == true){
            if(vundamentArvutatud == true && muudaVundamentRun == false){
                prussiKaugusValisseinast12 = vundament[0]["kaugus12"];
                prussiKaugusValisseinastAB = vundament[0]["kaugusab"];
                prussideArvTapsem = vundament[0]["arvtapsem"];
            }else{
                prussiKaugusValisseinast12 = document.querySelector("#prussiKaugus12").value;
                prussiKaugusValisseinastAB = document.querySelector("#prussiKaugusAB").value;
                prussideArvTapsem = document.querySelector("#prussideArv").value;
            }
            
        }
        if(muudaVundamentRun == true){
            vundamendiRing = document.querySelector("#vundamendiRing").checked;
        }
        var i=1;
        if(porandaSuund == "AB"){
            do {
                prussideArv = i;
                prussideVahe = Number((width-2*prussiKaugusValisseinast12-200-prussiW)/(prussideArv-1));
                i++
            }
            while ((prussideVahe >= 500));
            //prussideArv = Number(Math.ceil((width-200)/500)+1);
            //prussideVahe = Number((width-200-prussiW)/(prussideArv-1))
        }else{
            //prussideArv = Number(Math.ceil((depth-200)/500)+1);
            //prussideVahe = Number((depth-200-prussiW)/(prussideArv-1))
            do {
                prussideArv = i;
                prussideVahe = Number((depth-2*prussiKaugusValisseinastAB-200-prussiW)/(prussideArv-1));
                i++
            }
            while (prussideVahe >= 500);
        }
        
        if(tapsemadSeadedAvatudVundament == true){
            if(prussideArvTapsem > 0){
            prussideArv = prussideArvTapsem;
            if(porandaSuund == "AB"){
                prussideVahe = Number((width-2*prussiKaugusValisseinast12-200-prussiW)/(prussideArv-1));
            }else{
                prussideVahe = Number((depth-2*prussiKaugusValisseinastAB-200-prussiW)/(prussideArv-1));
            }
            };
        }
        //console.log("Prusside arv "+prussideArv);
        //console.log("Prusside vahe on "+prussideVahe);
        document.querySelector("#vundament").innerHTML = '<h3>Vundament</h3><ul id="vundamentNimekiri"></ul><input type="button" class="poolNuppu" value="Muuda vundamenti" onClick="muudaVundament();">'
            document.querySelector("#lisaVundamentPea").style.display="none";
        if(muudaVundamentRun == true){vundament.pop(); vundamentArvutatud = false};
        if(vundamentArvutatud == false){vundament.push({korgus: prussiH, laius: prussiW, arv: prussideArv, vahe: prussideVahe, kaugusab: prussiKaugusValisseinastAB, kaugus12: prussiKaugusValisseinast12, arvtapsem: prussideArvTapsem, ring: vundamendiRing, suund: porandaSuund});}
        tapsemadSeadedLahtiVundament = false;
        vundamentKirjuta();
        }
}

function lisaKatus(){
    katusLisatud = true;
    modalBody.innerHTML = ""
    modalPealkiri.innerHTML = "Lisa katus";
    modalBody.innerHTML = (
        '<div class="tekstiOsa"><h3>Katuse info:</h3>\
        <p>Määrake</p>\
        <span><label for="katuseYleulatus">Katuse üleulatus</label><input type="number" id="katuseYleulatus" value="" onChange="clearValue(\'#katuseLauaPikkus\',\'#katuseYleulatus\',\'katuselaua pikkuse\',\'katuse üleulatuse\')"></input></span>\
        <p>või</p>\
        <span><label for="katuseLauaPikkus">Katuselaua pikkus: </label><input type="number" id="katuseLauaPikkus" value="" onChange="clearValue(\'#katuseYleulatus\',\'#katuseLauaPikkus\',\'katuse üleulatuse\',\'katuselaua pikkuse\')"></input></span></div>\
        <p><span class="info">Kehtida saab ainult 1 väärtus</span></p>\
        <p style="clear: both">Katuse servalauad:</p>\
        <span><label for="esiraastalaud">Esiräästalaud: </label><input type="text" id="esiraastalaud" value="18x120")"></input></span>\
        <span><label for="papikinnituslaud">Papikinnituslauad: </label><input type="text" id="papikinnituslaud" value="18x95")"></input></span><br>\
        <p><span><label for="toelaud38">Toelauad: </label><input type="text" id="toelaud38" value="38x38")"></input></span>\
        <span><label for="toelaud95">Toelauad: </label><input type="text" id="toelaud95" value="18x95")"></input></span></p>\
        <p><input type="button" class="poolNuppu" value="Salvesta katus" onClick="lisaKatus2()"></p>')

    if(muudaKatusRun == true){
        document.querySelector("#katuseYleulatus").value = katuseLauaYleulatus;
        document.querySelector("#katuseLauaPikkus").value = katuseLauaPikkus;
        document.querySelector("#esiraastalaud").value = esiraastalaud;
        document.querySelector("#papikinnituslaud").value = papikinnituslaud;
        document.querySelector("#toelaud38").value = toelaud;
        document.querySelector("#toelaud95").value = toelaudSuurem;
    }
    modalBody.querySelector(".info").style.marginTop ="20px";
    modal.style.display = "block";
    var span = document.getElementsByClassName("close")[0];
    // When the user clicks on <span> (x), close the modal
    span.onclick = function() {
        modal.style.display = "none";
    }

    // When the user clicks anywhere outside of the modal, close it
    window.onclick = function(event) {
      if (event.target == modal) {
        modal.style.display = "none";
      }
    }

}

function clearValue(lahter1, lahter2, nimi1, nimi2){

    if(document.querySelector(lahter1).value == "" || document.querySelector(lahter1).value == 0){
        //console.log(lahter1+" on tühi");
    }else{
        vastus = confirm("Mõlemad ei saa kehtida, kas tühistada "+nimi2+" väärtus?\nVajutades Tühista/Cancel tühistatakse "+nimi1+" väärtus");
        if(vastus == true){
            document.querySelector(lahter1).value = "";
            document.querySelector(lahter2).focus();
        }else{
            document.querySelector(lahter2).value = "";
            document.querySelector(lahter1).focus();
        }
    }
}

function arvutaKatuseNurk() {

        
    if(viilKatus){
        katuseKolmnurgaAlus = Number(gableArvutuslikLaius)+2*(200+palgiPaksus);
    }else{
        katuseKolmnurgaAlus = Number(kolmnurkArvutuslikLaius)+2*(200+palgiPaksus);
    }

    if(viilKatus){
        KatuseKolmnurgaKorgus = (katuseKolmnurgaAlus*gableArvutuslikKorgus)/gableArvutuslikLaius;
        katuseLauaPikkusArvutuslik = Math.sqrt(Math.pow(katuseKolmnurgaAlus/2,2)+Math.pow(KatuseKolmnurgaKorgus,2));
    }else{
        KatuseKolmnurgaKorgus = (katuseKolmnurgaAlus*kolmnurkArvutuslikKorgus)/kolmnurkArvutuslikLaius;
        katuseLauaPikkusArvutuslik = Math.sqrt(Math.pow(katuseKolmnurgaAlus,2)+Math.pow(KatuseKolmnurgaKorgus,2));
    }
    if(viilKatus){
        hypotenuus2 = Math.sqrt(Math.pow(KatuseKolmnurgaKorgus,2)+Math.pow((katuseKolmnurgaAlus/2),2));
    }else{
        hypotenuus2 = Math.sqrt(Math.pow(KatuseKolmnurgaKorgus,2)+Math.pow((katuseKolmnurgaAlus),2));
    }
    katuseNurk3 = Math.asin((KatuseKolmnurgaKorgus)/hypotenuus2)*(180/Math.PI)

    return katuseNurk3
}

function lisaKatus2(){
modal.style.display = "none"
document.querySelector("#katus").style.display ="block"
document.querySelector("#katus").innerHTML = '<h3>Katus</h3><ul id="katusNimekiri"></ul><h3 class="raast">Räästa lauad</h3><ul id="raastaNimekiri"></ul><input type="button" class="poolNuppu" value="Muuda katust" onClick="muudaKatust();">'
document.querySelector("#lisaKatusPea").style.display="none";
arvutusTulemusedMujalt = true;
arvutaUus();
katuseKolmnurgaAlus = 0;
katuseLauaYleulatusArvutuslik = 0;

if(katusArvutatud == true && muudaKatusRun == false){
    katuseLauaPikkus = katus[0]["pikkus"];
    katuseLauaYleulatus = katus[0]["yleulatus"];
    esiraastalaud = katus[0]["rf"];
    papikinnituslaud = katus[0]["ee"];
    toelaudSuurem = katus[0]["rr1"];
    toelaud =katus[0]["rr2"];
}else{
    katuseLauaPikkus = Number(document.querySelector("#katuseLauaPikkus").value);
    katuseLauaYleulatus = Number(document.querySelector("#katuseYleulatus").value);
    esiraastalaud = document.querySelector("#esiraastalaud").value;
    papikinnituslaud = document.querySelector("#papikinnituslaud").value;
    toelaudSuurem = document.querySelector("#toelaud95").value;
    toelaud = document.querySelector("#toelaud38").value;
}
if(viilKatus){
    kaatet1 = Number(gableArvutuslikLaius/2);
    kaatet2 = Number(gableArvutuslikKorgus);
}else{
    kaatet1 = Number(kolmnurkArvutuslikLaius);
    kaatet2 = Number(kolmnurkArvutuslikKorgus);    
}

hypotenuus = Math.sqrt(Math.pow(kaatet1,2)+Math.pow(kaatet2,2));
katuseNurk2 = Math.sin(kaatet2/hypotenuus)*(180/Math.PI);

if(katusArvutatud == true){
    if(katus[0]["pikkus"] != 0 || katuseLauaPikkus != 0){
        if(viilKatus){
            katuseLauaYleulatusArvutuslik = Number(((katuseLauaPikkus*gableArvutuslikLaius/hypotenuus)-(width-200))/2);
        }else{
            katuseLauaYleulatusArvutuslik = Number(((katuseLauaPikkus*kolmnurkArvutuslikLaius/hypotenuus)-(depth-200))/2);
        }
    }    
}else{
    if(document.querySelector("#katuseYleulatus").value == 0){
        if(viilKatus){
            katuseLauaYleulatusArvutuslik = Number(((katuseLauaPikkus*gableArvutuslikLaius/hypotenuus)-(width-200))/2);
        }else{
            katuseLauaYleulatusArvutuslik = Number(((katuseLauaPikkus*kolmnurkArvutuslikLaius/hypotenuus)-(depth-200))/2);
        }
    }
      
}

/* if(katuseLauaYleulatus == 0 && katuseLauaPikkus == 0){
    document.querySelector("#katusNimekiri").innerHTML = '<input class="eemaldaMitu" type="button" value="-" onClick="eemaldaKatus()"><li>Kasutatkse katuse üleulatuse vaikeväärtust 200 mm'
} */

if(katuseLauaPikkus == 0){
    if (katuseLauaYleulatus == 0){
        if(viilKatus){
            katuseKolmnurgaAlus = Number(gableArvutuslikLaius)+2*(200+palgiPaksus);
        }else{
            katuseKolmnurgaAlus = Number(kolmnurkArvutuslikLaius)+2*(200+palgiPaksus);
        }
    }else{
        if(viilKatus){
            katuseKolmnurgaAlus = Number(gableArvutuslikLaius)+2*(katuseLauaYleulatus+palgiPaksus);
        }else{
            katuseKolmnurgaAlus = Number(kolmnurkArvutuslikLaius)+2*(katuseLauaYleulatus+palgiPaksus);
        }
    }
    if(viilKatus){
        KatuseKolmnurgaKorgus = (katuseKolmnurgaAlus*gableArvutuslikKorgus)/gableArvutuslikLaius;
        katuseLauaPikkusArvutuslik = Math.sqrt(Math.pow(katuseKolmnurgaAlus/2,2)+Math.pow(KatuseKolmnurgaKorgus,2));
    }else{
        KatuseKolmnurgaKorgus = (katuseKolmnurgaAlus*kolmnurkArvutuslikKorgus)/kolmnurkArvutuslikLaius;
        katuseLauaPikkusArvutuslik = Math.sqrt(Math.pow(katuseKolmnurgaAlus,2)+Math.pow(KatuseKolmnurgaKorgus,2));
    }
    
}
katusNimekiri()

if(viilKatus){
    hypotenuus2 = Math.sqrt(Math.pow(KatuseKolmnurgaKorgus,2)+Math.pow((katuseKolmnurgaAlus/2),2));
}else{
    hypotenuus2 = Math.sqrt(Math.pow(KatuseKolmnurgaKorgus,2)+Math.pow((katuseKolmnurgaAlus),2));
}
katuseNurk3 = Math.asin((KatuseKolmnurgaKorgus)/hypotenuus2)*(180/Math.PI)





lisakatusKirjuta();

//console.log("Gable arvutuslik laius on "+gableArvutuslikLaius);
//console.log("Gable arvutuslik kõrgus on "+gableArvutuslikKorgus);
//console.log("Gable arvutuslik hüpotenuus on "+hypotenuus);
//console.log("Katuse pikkus on "+katusePikkus)
//console.log("Katusekolmnurga alus on "+katuseKolmnurgaAlus+" ja kõrgus "+Number(KatuseKolmnurgaKorgus).toFixed(1));
//console.log("Katuse laudade arv on "+2*Math.round(katuseLaudadeArv/2));
//console.log("Uus katuse kolmnurga hüpotenuus2 on "+hypotenuus2+" ja nurk3 on "+katuseNurk3);

if(katuseLauaPikkus == 0){
    //console.log("Katuselaua pikkus on "+Number(katuseLauaPikkusArvutuslik).toFixed(1)+" ja katuse nurk on "+Number(katuseNurk3).toFixed(1)+String.fromCharCode(176));
}else{
    //console.log("Katuselaua pikkus on "+Number(katuseLauaPikkus).toFixed(1)+" ja katuse nurk on "+Number(katuseNurk3).toFixed(1)+String.fromCharCode(176));
}
}

const katusNimekiri = () => {
    document.querySelector("#katus").innerHTML = '<h3>Katus</h3><ul id="katusNimekiri"></ul><h3 class="raast">Räästa lauad</h3><ul id="raastaNimekiri"></ul><input type="button" class="poolNuppu" value="Muuda katust" onClick="muudaKatust();">'
    document.querySelector("#lisaKatusPea").style.display="none";

    if(katuseLauaYleulatus == 0 && katuseLauaPikkus == 0){
        document.querySelector("#katusNimekiri").innerHTML = '<li>Kasutatakse katuse üleulatuse vaikeväärtust 200 mm ja arvutuslikku katuselaua pikkust\
        '+Number(katuseLauaPikkusArvutuslik).toFixed(0)+' mm<input class="eemalda" type="button" value="-" onClick="eemaldaKatus()"></li>'
        katuseLauaYleulatusJoonisel = 200;
    }
    if(katuseLauaPikkus != 0 && katuseLauaYleulatus == 0){
            document.querySelector("#katusNimekiri").innerHTML = '<li>Kasutatakse katuse arvutuslikku üleulatust '+Number(katuseLauaYleulatusArvutuslik).toFixed(0)+' mm ja katuselaua pikkust\
        '+Number(katuseLauaPikkus).toFixed(0)+' mm<input class="eemalda" type="button" value="-" onClick="eemaldaKatus()"></input></li>'
        katuseLauaYleulatusJoonisel = katuseLauaYleulatusArvutuslik;
        
        if(viilKatus){
            katuseKolmnurgaAlus = Number(gableArvutuslikLaius)+2*(katuseLauaYleulatusArvutuslik+palgiPaksus);
            KatuseKolmnurgaKorgus = (katuseKolmnurgaAlus*gableArvutuslikKorgus)/gableArvutuslikLaius;
        }else{
            katuseKolmnurgaAlus = Number(kolmnurkArvutuslikLaius)+2*(katuseLauaYleulatusArvutuslik+palgiPaksus);
            KatuseKolmnurgaKorgus = (katuseKolmnurgaAlus*kolmnurkArvutuslikKorgus)/kolmnurkArvutuslikLaius;
        }
    
    }
    
    if(katuseLauaPikkus == 0 && katuseLauaYleulatus != 0){
        document.querySelector("#katusNimekiri").innerHTML = '<li>Kasutatakse katuse üleulatust '+katuseLauaYleulatus+' mm ja arvutuslikku katuselaua pikkust\
        '+Number(katuseLauaPikkusArvutuslik).toFixed(0)+' mm<input class="eemalda" type="button" value="-" onClick="eemaldaKatus()"></li>'
        katuseLauaYleulatusJoonisel = katuseLauaYleulatus;
    }
}



function lisakatusKirjuta(){
    if(pikemadLauad.length > 0){
        pikimLaud = [];
        for(var i=0; i<pikemadLauad.length; i++){
            pikimLaud.push([pikemadLauad[i]["pikkus"]]);
        }
        //console.log(pikimLaud);
        katusePikkus = Math.max.apply(this, pikimLaud);
    }else{
        if(viilKatus){
            katusePikkus = depth;
        }else{
            katusePikkus = width;
        }
    }
    if(viilKatus){
        katuseLaudadeArv = 2+2*Math.round((katusePikkus/110*2)/2);
    }else{
        katuseLaudadeArv = 2+2*Math.round((katusePikkus/110)/2);
    }   
    
    
    //vundamendiPikkus = 0;
    katusInfo = document.querySelector("#katusInfo");
    let katusInfo2 = document.querySelector("#katusInfo2");
    katusInfo.querySelector(".ymbris").innerHTML = (
        "<ul>\
        </ul>");
    document.querySelector("#raastaNimekiri").innerHTML = ""
    katusInfo.querySelector(".ymbris").querySelector("ul").innerHTML = ("<li>Katuselaudade arv on: "+katuseLaudadeArv+" tk</li>")
    if(katuseLauaPikkus== 0){
        if(viilKatus){
            katuseLaudadeKulu = katuseLaudadeArv*katuseLauaPikkusArvutuslik/1000;
            katusInfo.querySelector(".ymbris").querySelector("ul").innerHTML += ("<li>Katuselaudade kulu on "+Number(katuseLaudadeKulu).toFixed(1)+" jm</li>")
            document.querySelector("#raastaNimekiri").innerHTML += "<li>4 x esiräästalaud (RF) profiiliga "+esiraastalaud+" mm, pikkusega "+Number(5*Math.round((katuseLauaPikkusArvutuslik+38)/5)).toFixed(0)+" mm ja kogupikkusega\
            "+Number(4*5*Math.round((katuseLauaPikkusArvutuslik+18)/5)/1000).toFixed(2)+" jm</li>";
            document.querySelector("#raastaNimekiri").innerHTML += "<li>4 x papikinnituslauad (EE) profiiliga "+papikinnituslaud+" mm, pikkusega "+Number(5*Math.round((katuseLauaPikkusArvutuslik+38)/5)).toFixed(0)+" mm ja kogupikkusega\
            "+Number(4*5*Math.round((katuseLauaPikkusArvutuslik+18)/5)/1000).toFixed(2)+" jm</li>";
            document.querySelector("#raastaNimekiri").innerHTML += "<li>2 x katuselaudade toelauad profiiliga "+toelaud+" mm, pikkusega "+katusePikkus+" mm ja kogupikkusega \
            "+Number(2*katusePikkus/1000).toFixed(2)+" jm</li>";
            document.querySelector("#raastaNimekiri").innerHTML += "<li>2 x katuselaudade toelauad profiiliga "+toelaudSuurem+" mm, pikkusega "+katusePikkus+" mm ja kogupikkusega \
            "+Number(2*katusePikkus/1000).toFixed(2)+" jm</li>";
            servaLauadKokku = ((4*5*Math.round((katuseLauaPikkusArvutuslik+18)/5)+4*5*Math.round((katuseLauaPikkusArvutuslik+18)/5))+2*katusePikkus+2*katusePikkus);
            servalauadSummaKokku = (4*5*Math.round((katuseLauaPikkusArvutuslik+18)/5))/1000*hinnad.esiraastalaud+(4*5*Math.round((katuseLauaPikkusArvutuslik+18)/5))/1000*hinnad.papikinnituslaud+(2*katusePikkus)/1000*hinnad.toelaud38+(2*katusePikkus)/1000*hinnad.toelaud95
        }else{
            katuseLaudadeKulu = katuseLaudadeArv*katuseLauaPikkusArvutuslik/1000;
            katusInfo.querySelector(".ymbris").querySelector("ul").innerHTML += ("<li>Katuselaudade kulu on "+Number(katuseLaudadeKulu).toFixed(1)+" jm</li>")
            document.querySelector("#raastaNimekiri").innerHTML += "<li>2 x esiräästalaud (RF) profiiliga "+esiraastalaud+" mm, pikkusega "+Number(5*Math.round((katuseLauaPikkusArvutuslik+38)/5)).toFixed(0)+" mm ja kogupikkusega\
            "+Number(2*5*Math.round((katuseLauaPikkusArvutuslik+18)/5)/1000).toFixed(2)+" jm</li>";
            document.querySelector("#raastaNimekiri").innerHTML += "<li>2 x papikinnituslauad (EE) profiiliga "+papikinnituslaud+" mm, pikkusega "+Number(5*Math.round((katuseLauaPikkusArvutuslik+38)/5)).toFixed(0)+" mm ja kogupikkusega\
            "+Number(2*5*Math.round((katuseLauaPikkusArvutuslik+18)/5)/1000).toFixed(2)+" jm</li>";
            document.querySelector("#raastaNimekiri").innerHTML += "<li>2 x katuselaudade toelauad profiiliga "+toelaud+" mm, pikkusega "+katusePikkus+" mm ja kogupikkusega \
            "+Number(2*katusePikkus/1000).toFixed(2)+" jm</li>";
            document.querySelector("#raastaNimekiri").innerHTML += "<li>2 x katuselaudade toelauad profiiliga "+toelaudSuurem+" mm, pikkusega "+katusePikkus+" mm ja kogupikkusega \
            "+Number(2*katusePikkus/1000).toFixed(2)+" jm</li>";
            servaLauadKokku = ((2*5*Math.round((katuseLauaPikkusArvutuslik+18)/5)+2*5*Math.round((katuseLauaPikkusArvutuslik+18)/5))+2*katusePikkus+2*katusePikkus);
            servalauadSummaKokku = (2*5*Math.round((katuseLauaPikkusArvutuslik+18)/5))/1000*hinnad.esiraastalaud+(2*5*Math.round((katuseLauaPikkusArvutuslik+18)/5))/1000*hinnad.papikinnituslaud+(2*katusePikkus)/1000*hinnad.toelaud38+(2*katusePikkus)/1000*hinnad.toelaud95    
        }
    }else{
        if(viilKatus){
            katuseLaudadeKulu = katuseLaudadeArv*katuseLauaPikkus/1000;
            katusInfo.querySelector(".ymbris").querySelector("ul").innerHTML += ("<li>Katuselaudade kulu on "+Number(katuseLaudadeKulu).toFixed(1)+" jm</li>")
            document.querySelector("#raastaNimekiri").innerHTML += "<li>4 x esiräästalaud (RF) profiiliga "+esiraastalaud+" mm, pikkusega "+Number(5*Math.round((katuseLauaPikkus+38)/5)).toFixed(0)+" mm ja kogupikkusega\
            "+Number(4*5*Math.round((katuseLauaPikkus+18)/5)/1000).toFixed(2)+" jm</li>";
            document.querySelector("#raastaNimekiri").innerHTML += "<li>4 x papikinnituslauad (EE) profiiliga "+papikinnituslaud+" mm, pikkusega "+Number(5*Math.round((katuseLauaPikkus+38)/5)).toFixed(0)+" mm ja kogupikkusega\
            "+Number(4*5*Math.round((katuseLauaPikkus+18)/5)/1000).toFixed(2)+" jm</li>";
            document.querySelector("#raastaNimekiri").innerHTML += "<li>2 x katuselaudade toelauad profiiliga "+toelaud+" mm, pikkusega "+katusePikkus+" mm ja kogupikkusega \
            "+Number(2*katusePikkus/1000).toFixed(2)+" jm</li>";
            document.querySelector("#raastaNimekiri").innerHTML += "<li>2 x katuselaudade toelauad profiiliga "+toelaudSuurem+" mm, pikkusega "+katusePikkus+" mm ja kogupikkusega \
            "+Number(2*katusePikkus/1000).toFixed(2)+" jm</li>";
            servaLauadKokku = ((4*5*Math.round((katuseLauaPikkus+18)/5)+4*5*Math.round((katuseLauaPikkus+18)/5))+2*katusePikkus+2*katusePikkus);
            servalauadSummaKokku = (4*5*Math.round((katuseLauaPikkus+18)/5))/1000*hinnad.esiraastalaud+(4*5*Math.round((katuseLauaPikkus+18)/5))/1000*hinnad.papikinnituslaud+(2*katusePikkus)/1000*hinnad.toelaud38+(2*katusePikkus)/1000*hinnad.toelaud95
        }else{
            katuseLaudadeKulu = katuseLaudadeArv*katuseLauaPikkus/1000;
            katusInfo.querySelector(".ymbris").querySelector("ul").innerHTML += ("<li>Katuselaudade kulu on "+Number(katuseLaudadeKulu).toFixed(1)+" jm</li>")
            document.querySelector("#raastaNimekiri").innerHTML += "<li>2 x esiräästalaud (RF) profiiliga "+esiraastalaud+" mm, pikkusega "+Number(5*Math.round((katuseLauaPikkus+38)/5)).toFixed(0)+" mm ja kogupikkusega\
            "+Number(2*5*Math.round((katuseLauaPikkus+18)/5)/1000).toFixed(2)+" jm</li>";
            document.querySelector("#raastaNimekiri").innerHTML += "<li>2 x papikinnituslauad (EE) profiiliga "+papikinnituslaud+" mm, pikkusega "+Number(5*Math.round((katuseLauaPikkus+38)/5)).toFixed(0)+" mm ja kogupikkusega\
            "+Number(2*5*Math.round((katuseLauaPikkus+18)/5)/1000).toFixed(2)+" jm</li>";
            document.querySelector("#raastaNimekiri").innerHTML += "<li>2 x katuselaudade toelauad profiiliga "+toelaud+" mm, pikkusega "+katusePikkus+" mm ja kogupikkusega \
            "+Number(2*katusePikkus/1000).toFixed(2)+" jm</li>";
            document.querySelector("#raastaNimekiri").innerHTML += "<li>2 x katuselaudade toelauad profiiliga "+toelaudSuurem+" mm, pikkusega "+katusePikkus+" mm ja kogupikkusega \
            "+Number(2*katusePikkus/1000).toFixed(2)+" jm</li>";
            servaLauadKokku = ((2*5*Math.round((katuseLauaPikkus+18)/5)+2*5*Math.round((katuseLauaPikkus+18)/5))+2*katusePikkus+2*katusePikkus);
            servalauadSummaKokku = (2*5*Math.round((katuseLauaPikkus+18)/5))/1000*hinnad.esiraastalaud+(2*5*Math.round((katuseLauaPikkus+18)/5))/1000*hinnad.papikinnituslaud+(2*katusePikkus)/1000*hinnad.toelaud38+(2*katusePikkus)/1000*hinnad.toelaud95
        }
    }
    

    katusInfo.querySelector(".ymbris").querySelector("ul").innerHTML += ("<li>Katuse nurk on "+Number(katuseNurk3).toFixed(1)+String.fromCharCode(176)+"</li>");
    katusInfo.style.transition = "height 1s";
    katusInfo.style.border = "3px solid #2d6870";
   // document.querySelector("#uksed").style.borderTop = "3px solid black";
    katusInfo.style.borderRadius = "10px 0"
    katusInfo.style.height = katusInfo.querySelector(".ymbris").clientHeight+32+"px";
    if(muudaKatusRun == true){katus.pop(); katusArvutatud = false};
    if(katusArvutatud == false){katus.push({pikkus:katuseLauaPikkus, yleulatus: katuseLauaYleulatus, arvutuslikYleulatus: katuseLauaYleulatusArvutuslik, arvutuslikpikkus: katuseLauaPikkusArvutuslik, rf:esiraastalaud, ee: papikinnituslaud, rr2:toelaud, rr1:toelaudSuurem});}
    arvutusTulemusedMujalt = false;
    arvutaUus()
    katusArvutatud = true;
    muudaKatusRun = false;
    if(joonestatud == true){joonesta()}
    if(servaLauadKokku>0){
        katus2Info.innerHTML = "";
        katus2Info.innerHTML += "<li><span class='esimenePool'>Katuse servalauad: </span><span class='teinePool'>"+Number(servaLauadKokku/1000).toFixed(2)+"</span> jm<span class='kolmasPool'>"+Number(servalauadSummaKokku).toFixed(2)+"</span> €</li>"
        
    }
    if(katuseLaudadeKulu>0){
        katuseLauadSummaKokku = Number(katuseLaudadeKulu*hinnad.katuseLauad);
        katus2Info.innerHTML += "<li><span class='esimenePool'>Katuselauad: </span><span class='teinePool'>"+Number(katuseLaudadeKulu).toFixed(2)+"</span> jm<span class='kolmasPool'>"+Number(katuseLaudadeKulu*hinnad.katuseLauad).toFixed(2)+"</span> €</li>"
    }
    eemaldaNuppKorgus();
    detailInfo();
    a.contentDocument.getElementById("katuselauad").style.display = "block";
    katusInfo2.querySelector(".ymbris").innerHTML = katusInfo.querySelector(".ymbris").innerHTML
    katusInfo2.querySelector(".ymbris").querySelector("ul").innerHTML+= document.querySelector("#katusNimekiri").innerHTML
    katusInfo2.querySelector(".ymbris").querySelector("ul").innerHTML+= document.querySelector("#raastaNimekiri").innerHTML
    katusInfo2.querySelectorAll("input").forEach(element => {element.outerHTML = ""});
    // detailInfo2();

}

function muudaKatust() {
    muudaKatusRun = true;
    if(katuseLauaPikkus == 0){
        katuseLauaPikkusArvutuslik = katus[0]["arvutuslikpikkus"];
    }else{
        katuseLauaPikkus = katus[0]["pikkus"];
    }
    katuseLauaYleulatus = katus[0]["yleulatus"];
    esiraastalaud = katus[0]["rf"];
    papikinnituslaud = katus[0]["ee"];
    toelaud = katus[0]["rr2"];
    toelaudSuurem = katus[0]["rr1"];

    lisaKatus();
}

function eemaldaKatus(){
    katusArvutatud = false;
    muudaKatusRun = false;
    katuseLaudadeArv = 0;
    katuseLauaPikkus = 0;
    katuseLauaPikkusArvutuslik = 0;
    katuseLauadJm = 0;
    servalauadSummaKokku = 0;
    katuseLauadSummaKokku = 0;
    esiraastalaud = "18x120";
    papikinnituslaud = "18x95";
    toelaud = "38x38";
    toelaudSuurem = "18x95";
    document.querySelector("#katus").innerHTML = "";
    document.querySelector("#lisaKatusPea").style.display="block";
    katusInfo = document.querySelector("#katusInfo");
    katusInfo2 = document.querySelector("#katusInfo2");
    katusInfo.querySelector(".ymbris").innerHTML ="";
    katusInfo2.querySelector(".ymbris").innerHTML ="";
    katus2Info.innerHTML ="";
    katusInfo.style.border = "none";
    katusInfo.style.borderRadius = "10px 0"
    katusInfo.style.height = "0";
    katusInfo.style.transition = "height 0s";
    katus.pop();
    if (arvutaTulemusedArvutatud == true){arvutaUus();}
        if(document.querySelector("#arvutuseTulemused").clientHeight !== 0){
        arvutaUus()
    }
    if(joonestatud == true){joonesta()}
    a.contentDocument.getElementById("katuselauad").style.display= "none";


}
 
function lisaParlin(){
    parlinLisatud = true;
    modalBody.innerHTML = ""
    modalPealkiri.innerHTML = "Lisa pärlinid";
    if(viilKatus){
        modalBody.innerHTML = (
            '<div class="tekstiOsa taisLaius"><h3>Pärlinite info:</h3>\
            <p>Pärlinite mõõdud</p>\
            <span><label for="parliniLaius">Pärlini laius:</label><input type="number" id="parliniLaius" value="40"> mm</span>\
            <span><label for="parliniKorgus">Pärlini kõrgus:</label><input type="number" id="parliniKorgus" value="143"> mm</span>\
            <p><span><label for="parliniArv">Pärlinite arv ühel poolel:</label><input type="number" id="parliniArv" value=""> tk</span></p>\
            <span>või ainult tipu pärlin<input type="checkbox" id="ainultParlin" name="ainultParlin"></span>\
            <p><span class="info">Jättes pärlini arvu täitmata, arvutakse pärlinite arv automaatselt arvestades pärlini vahemikuga 600-700 mm</span></p>\
            <p><input type="button" class="poolNuppu" value="Salvesta pärlinid" onClick="lisaParlin2()"></p>')
    }else{
        modalBody.innerHTML = (
            '<div class="tekstiOsa taisLaius"><h3>Pärlinite info:</h3>\
            <p>Pärlinite mõõdud</p>\
            <span><label for="parliniLaius">Pärlini laius:</label><input type="number" id="parliniLaius" value="40"> mm</span>\
            <span><label for="parliniKorgus">Pärlini kõrgus:</label><input type="number" id="parliniKorgus" value="143"> mm</span>\
            <p><span><label for="parliniArv">Pärlinite arv:</label><input type="number" id="parliniArv" value=""> tk</span></p>\
            <p><span class="info">Jättes pärlini arvu täitmata, arvutakse pärlinite arv automaatselt arvestades pärlini vahemikuga 600-700 mm</span></p>\
            <p><input type="button" class="poolNuppu" value="Salvesta pärlinid" onClick="lisaParlin2()"></p>')
    }

        
        modalBody.querySelector(".info").style.marginTop ="20px";
        modal.style.display = "block";
    
    if(muudaParlinRun == true){
        document.querySelector("#parliniKorgus").value = parlinKorgus;
        document.querySelector("#parliniLaius").value = parlinLaius;
        document.querySelector("#parliniArv").value = parlinArv;
        if(viilKatus){document.querySelector("#ainultParlin").checked = tipuParlin;}
    }

        var span = document.getElementsByClassName("close")[0];
        // When the user clicks on <span> (x), close the modal
        span.onclick = function() {
            modal.style.display = "none";
            
        }
    
        // When the user clicks anywhere outside of the modal, close it
        window.onclick = function(event) {
          if (event.target == modal) {
            modal.style.display = "none";
          }
        }
    
}

function lisaParlin2(){
    modal.style.display = "none";
    document.querySelector("#parlin").innerHTML = '<h3>Pärlin</h3><ul id="parlinNimekiri"></ul><input type="button" class="poolNuppu" value="Muuda pärlinit" onClick="muudaParlin();">'
    document.querySelector("#lisaParlinPea").style.display="none";
    arvutusTulemusedMujalt = true;
    arvutaUus();
    if(viilKatus){
        kaatet1 = Number(gableArvutuslikLaius/2);
        kaatet2 = Number(gableArvutuslikKorgus);
    }else{
        kaatet1 = Number(kolmnurkArvutuslikLaius);
        kaatet2 = Number(kolmnurkArvutuslikKorgus);
     }
    hypotenuus = Math.sqrt(Math.pow(kaatet1,2)+Math.pow(kaatet2,2));

    if(parlinArvutatud == true && muudaParlinRun == false){ //* Kas see on see, miks pärlin töötab aga teised mitte ?
        parlinKorgus = parlin[0]["korgus"];
        parlinLaius= parlin[0]["laius"];
        parlinArv = parlin[0]["arv"];

    }else{
        parlinKorgus = modalBody.querySelector("#parliniKorgus").value;    
        parlinLaius= modalBody.querySelector("#parliniLaius").value;
        parlinArv = Number(modalBody.querySelector("#parliniArv").value);
        if(viilKatus){tipuParlin = modalBody.querySelector("#ainultParlin").checked}
    }
    document.querySelector("#parlinNimekiri").innerHTML = "";

    var i = 0;
    if(tipuParlin == true){
        parlinArv = 0;
    }
    else{
        if(parlinArv == 0){
    do {
        parlinArvArvutuslik = i;
        parlinVahe = Number((hypotenuus)/(parlinArvArvutuslik+1));
        i++
    }
    while ((parlinVahe >= 700));
    }else{
        parlinVahe = Number(hypotenuus/(parlinArv+1));
        
    }

    
        //console.log("Pärlinite vahe on "+parlinVahe)
    }
 
        // document.querySelector("#parlinNimekiri").innerHTML += "<li>Pärlinite vahe on "+Number(parlinVahe).toFixed(1)+" mm</li>"

    
    
    lisaParlinKirjuta();
    



}
function lisaParlinKirjuta(){
    document.querySelector("#parlin").style.display ="block"

    parlinNimekiri()
	
    parlinInfo.style.transition = "height 1s";
    parlinInfo.style.border = "3px solid #2d6870";
   // document.querySelector("#uksed").style.borderTop = "3px solid black";
    parlinInfo.style.borderRadius = "10px 0"
    parlinInfo.style.height = parlinInfo.querySelector(".ymbris").clientHeight+32+"px";
    if(muudaParlinRun == true){parlin.pop(); parlinArvutatud = false};
    if(parlinArvutatud == false){parlin.push({pikkus: parlinPikkus, arv: parlinArv, arvutuslik: parlinArvArvutuslik, korgus: parlinKorgus, laius: parlinLaius, vahe: parlinVahe, tipp: tipuParlin});}
    arvutusTulemusedMujalt = false;
    arvutaUus()
    parlinArvutatud = true;
    muudaParlinRun = false;
    if(parlinKulu>0){
        parlin2info.innerHTML = "";
        parlin2info.innerHTML += "<li><span class='esimenePool'>Pärlinid: </span><span class='teinePool'>"+Number(parlinKulu).toFixed(2)+"</span> jm<span class='kolmasPool'>"+Number(parlinKulu*hinnad.parlinid).toFixed(2)+"</span> €</li>"
        parlinSummaKokku = Number(parlinKulu*hinnad.parlinid);
    }
    eemaldaNuppKorgus();
    detailInfo();
    a.contentDocument.getElementById("parlinid").style.display = "block";
    parlinInfo2.querySelector(".ymbris").innerHTML = parlinInfo.querySelector(".ymbris").innerHTML
    parlinInfo2.querySelector(".ymbris").querySelector("ul").innerHTML+= document.querySelector("#parlinNimekiri").innerHTML
    parlinInfo2.querySelectorAll("input").forEach(element => {element.outerHTML = ""});
      // detailInfo2();
}

const parlinNimekiri = () => {
    document.querySelector("#parlin").innerHTML = '<h3>Pärlin</h3><ul id="parlinNimekiri"></ul><input type="button" class="poolNuppu" value="Muuda pärlinit" onClick="muudaParlin();">'
    document.querySelector("#lisaParlinPea").style.display="none";

    document.querySelector("#parlinNimekiri").innerHTML = "";
    if(parlinArv > 1 || parlinArvArvutuslik > 1){
        document.querySelector("#parlinNimekiri").innerHTML += '<input class="eemaldaMitu" type="button" value="-" onClick="eemaldaParlin()"><li>Kasutatakse pärlineid mõõduga '+parlinLaius+' mm x '+parlinKorgus+' mm</li>'
    }else{
        document.querySelector("#parlinNimekiri").innerHTML += '<input class="eemaldaMitu" type="button" value="-" onClick="eemaldaParlin()"><li>Kasutatakse pärlinit mõõduga '+parlinLaius+' mm x '+parlinKorgus+' mm</li>'
    }
    if(tipuParlin == true){
        //console.log("Ainult pärlin arv on "+parlinArv)
        document.querySelector("#parlinNimekiri").innerHTML += "<li>Pärlinite kogus: 1 tipupärlin</li>"
    }else{
        if(parlinArv == 0 || parlinArv == null || parlinArv == ""){
            //console.log("Pärlinite arvutuslik arv on "+parlinArvArvutuslik)
            if(viilKatus){
                document.querySelector("#parlinNimekiri").innerHTML += "<li>Pärlinite arvutuslik kogus: "+parlinArvArvutuslik*2+" tk + 1 tipupärlin</li>"
            }else{
                document.querySelector("#parlinNimekiri").innerHTML += "<li>Pärlinite arvutuslik kogus: "+parlinArvArvutuslik+" tk</li>"
            } 
        }else{
            //console.log("Pärlinite arv on "+parlinArv)
            if(viilKatus){
                document.querySelector("#parlinNimekiri").innerHTML += "<li>Pärlinite kogus "+parlinArv*2+" tk + 1 tipupärlin</li>"

            }else{
                document.querySelector("#parlinNimekiri").innerHTML += "<li>Pärlinite kogus "+parlinArv+" tk</li>"
            }
        }}
    if(pikemadLauad.length > 0){
        pikimLaud = [];
        for(var i=0; i<pikemadLauad.length; i++){
            pikimLaud.push([pikemadLauad[i]["pikkus"]]);
        }
        //console.log(pikimLaud);
        parlinPikkus = Math.max.apply(this, pikimLaud);
    }else{
        parlinPikkus = depth;
    }
    if(tipuParlin == true){
        document.querySelector("#parlinNimekiri").innerHTML += "<li>Pärlini pikkus on "+parlinPikkus+" mm</li>"
    }else{
        document.querySelector("#parlinNimekiri").innerHTML += "<li>Pärlinite pikkus on "+parlinPikkus+" mm</li>"
    }   
    parlinInfo = document.querySelector("#parlinInfo");
    let parlinInfo2 = document.querySelector("#parlinInfo2");
    parlinInfo.querySelector(".ymbris").innerHTML = (
        "<ul>\
        </ul>");
    if(tipuParlin == true){
        parlinInfo.querySelector(".ymbris").querySelector("ul").innerHTML += "<li>Pärlini kulu on 1 tipupärlin "+Number(1*parlinPikkus/1000).toFixed(1)+" jm</li>"
        parlinKulu = (1*parlinPikkus/1000)
    } else {   
        parlinInfo.querySelector(".ymbris").querySelector("ul").innerHTML += "<li>Pärlinite vahe on "+Number(parlinVahe).toFixed(1)+" mm</li>"
        if(parlinArv == 0){
            // parlinInfo.querySelector(".ymbris").querySelector("ul").innerHTML = ("<li>Pärlinite arvutuslik kogus: "+parlinArvArvutuslik+" tk</li>")
            if(viilKatus){
                parlinInfo.querySelector(".ymbris").querySelector("ul").innerHTML += ("<li>Pärlinite kulu (koos tipupärliniga) on "+Number(((parlinArvArvutuslik*2+1)*parlinPikkus/1000)).toFixed(1)+" jm</li>")
                parlinKulu = ((parlinArvArvutuslik*2+1)*parlinPikkus/1000);    
            }else{
                parlinInfo.querySelector(".ymbris").querySelector("ul").innerHTML += ("<li>Pärlinite kulu on "+Number(((parlinArvArvutuslik)*parlinPikkus/1000)).toFixed(1)+" jm</li>")
                parlinKulu = ((parlinArvArvutuslik)*parlinPikkus/1000);
            }            
        }else{
            // parlinInfo.querySelector(".ymbris").querySelector("ul").innerHTML = ("<li>Pärlinite arv: "+parlinArv+" tk</li>")
            if(viilKatus){
                parlinInfo.querySelector(".ymbris").querySelector("ul").innerHTML += ("<li>Pärlinite kulu (koos tipupärliniga) on "+Number(((parlinArv*2+1)*parlinPikkus/1000)).toFixed(1)+" jm</li>")
                parlinKulu = ((parlinArv*2+1)*parlinPikkus/1000);
            }else{
                parlinInfo.querySelector(".ymbris").querySelector("ul").innerHTML += ("<li>Pärlinite kulu on "+Number(((parlinArv)*parlinPikkus/1000)).toFixed(1)+" jm</li>")
                parlinKulu = ((parlinArv)*parlinPikkus/1000);
            }
        }
    }


}

function eemaldaParlin(){
    parlinArvutatud = false;
    muudaParlinRun = false;
    tipuParlin = false;
    parlinVahe = 0;
    parlinArvutuslikArv = 0;
    parlinArv = 0;
    parlinSummaKokku = 0;
    document.querySelector("#parlin").innerHTML = "";
    document.querySelector("#lisaParlinPea").style.display="block";
    parlinInfo = document.querySelector("#parlinInfo");
    parlinInfo.querySelector(".ymbris").innerHTML ="";
    parlinInfo2 = document.querySelector("#parlinInfo2");
    parlinInfo2.querySelector(".ymbris").innerHTML ="";
    parlin2info.innerHTML = "";
    parlinInfo.style.border = "none";
    parlinInfo.style.borderRadius = "10px 0"
    parlinInfo.style.height = "0";
    parlinInfo.style.transition = "height 0s";
    parlin.pop();
    if (arvutaTulemusedArvutatud == true){arvutaUus();}
    if(document.querySelector("#arvutuseTulemused").clientHeight !== 0){
        arvutaUus()  
    }
    a.contentDocument.getElementById("parlinid").style.display = "none";

}

function muudaParlin(){
	muudaParlinRun = true;
    if(parlinArv == 0){
        parlinArvArvutuslik = parlin[0]["arvutuslik"];
    }else{
        parlinArv = parlin[0]["arv"];
    }
	parlinKorgus = parlin[0]["korgus"];
	parlinLaius = parlin[0]["laius"];
	parlinVahe = parlin[0]["vahe"];
    tipuParlin = parlin[0]["tipp"];
    lisaParlin();
}
let erinevadSeeriadUks = 0
let distinctSeeriaUks = []

function usteInfoDetailidesse(){
    usteHinnad = ""
    usteSummaKokku = 0;
    var usteSeeriaMax = [];
    uksed2Info.innerHTML = "";
    seeriateArv = 0
    erinevadSeeriadUks = 0
    distinctSeeriaUks = []
    /* if(uksed.length <= 1){
        uksed2Info.innerHTML = "<h4>Uks:</h4>";
    }else{
        uksed2Info.innerHTML = "<h4>Uksed:</h4>";
    } */
    for(k=0; k<uksed.length; k++){
        usteSeeriaMax.push(uksed[k]['seeria'])
    }
    //console.log("Uste seeria", usteSeeriaMax)
    distinctSeeriaUks = [...new Set(usteSeeriaMax)]
    //console.log("Erinevad seeriad", distinctSeeriaUks)
    erinevadSeeriadUks = distinctSeeriaUks.length
    //console.log("Erinevad seeriad: "+distinctSeeriaUks+ " ja arvuliselt: "+ erinevadSeeriadUks + " tk")
   // if(seeriateArv == 0){seeriateArv = 1}
   // //console.log("Max seeria on "+seeriateArv)
    for(i=0; i < erinevadSeeriadUks; i++){
        var kogus = 0;
        for(l=0; l<uksed.length; l++){
            if(uksed[l]["seeria"] == distinctSeeriaUks[i]){
                kogus= kogus+1;
                sarnasteMoodud = Number(uksed[l]["ukselaius"]-15)+" x "+Number(uksed[l]["uksekorgus"]-40)
            }
         
        }
        if(kogus != 0){
            if(hinnad["uks"+distinctSeeriaUks[i]] == null){hinnad["uks"+distinctSeeriaUks[i]] = 0;}
            //console.log("Sarnaste uste kogus on "+kogus+" mõõtudega "+sarnasteMoodud)
            uksed2Info.innerHTML += "<li><span class='esimenePool'>Uks (ca "+sarnasteMoodud+")</span><span class='teinePool'>"+kogus+"</span> tk <span class='kolmasPool'>"+Number(hinnad["uks"+distinctSeeriaUks[i]]*kogus).toFixed(2)+"</span> €</li>"
            uksHinnad.push({sarnasteMoodud, kogus});
            usteHinnad += '<span><label for="uks'+distinctSeeriaUks[i]+'">Uks '+sarnasteMoodud+':</label><input type="number" id="uks'+distinctSeeriaUks[i]+'" value=""> €</span>'
            usteSummaKokku+= Number(hinnad["uks"+distinctSeeriaUks[i]]*kogus)
        }
    }
    usteHindSalvestatud = false;
    detailInfo();
    // detailInfo2();
}
let erinevadSeeriadAken = 0
let distinctSeeriaAken = []
function akendeInfoDetailidesse(){
    akendeHinnad = ""
    akendeSummaKokku = 0;
    var akendeSeeriaMax = [];
    aknad2Info.innerHTML = "";
    /* if(aknad.length <= 1){
        aknad2Info.innerHTML = "<h4>Aken:</h4>";
    }else{
        aknad2Info.innerHTML = "<h4>Aknad:</h4>";
    } */
    for(k=0; k<aknad.length; k++){
        akendeSeeriaMax.push(aknad[k]["seeria"])
    }
    //console.log("Akende seeria", akendeSeeriaMax)
    distinctSeeriaAken = [... new Set(akendeSeeriaMax)]
    //console.log("Erinevad seeriad", distinctSeeriaAken)
    erinevadSeeriadAken = distinctSeeriaAken.length
    //console.log("Erinevad seeriad: "+distinctSeeriaAken+" ja arvuliselt: "+erinevadSeeriadAken+" tk")
    for(i=0; i<erinevadSeeriadAken; i++){
        var kogus = 0;
        for(l=0; l<aknad.length; l++){
            if(aknad[l]["seeria"] == distinctSeeriaAken[i]){
                kogus= kogus+1;
                sarnasteMoodud = Number(aknad[l]["laius"]-10)+" x "+Number(aknad[l]["korgus"]-40)
            }
         
        }
        if(kogus != 0){
            if(hinnad["aken"+distinctSeeriaAken[i]] == null){hinnad["aken"+distinctSeeriaAken[i]] = 0;}           
            //console.log("Sarnaste akende kogus on "+kogus+" mõõtudega "+sarnasteMoodud)
            aknad2Info.innerHTML += "<li><span class='esimenePool'>Aken (ca "+sarnasteMoodud+")</span><span class='teinePool'>"+kogus+"</span> tk <span class='kolmasPool'>"+Number(hinnad["aken"+distinctSeeriaAken[i]]*kogus).toFixed(2)+"</span> €</li>"
            aknaHinnad.push({sarnasteMoodud, kogus});
            akendeHinnad += '<span><label for="aken'+distinctSeeriaAken[i]+'">Aken '+sarnasteMoodud+':</label><input type="number" id="aken'+distinctSeeriaAken[i]+'" value=""> €</span>'
            akendeSummaKokku+= Number(hinnad["aken"+distinctSeeriaAken[i]]*kogus)
        }
    }
    detailInfo();
    // detailInfo2();
}

 
function detailInfo() {
    jooniseInfoH1 = document.querySelector("#jooniseInfo").querySelector("h1");
    summaKokkuH1 = document.querySelector(".summaKokku");
    jooniseInfoYmbris = document.querySelector("#jooniseInfo").querySelector(".ymbris");
    if(jooniseInfoYmbris.clientHeight > 0){
        jooniseInfoH1.style.display = "block";
        summaKokkuH1.style.display = "block"
    }else{
        jooniseInfoH1.style.display = "none";
        summaKokkuH1.style.display = "none";
    }
    summeeritudSumma = 0;
    summeeritudSumma = servalauadSummaKokku+katuseLauadSummaKokku+parlinSummaKokku+jooksvadMeetridSummaKokku+vundmendiSummaKokku+porandaSummaKokku+tuuleliistudSummaKokku+usteSummaKokku+akendeSummaKokku;
    summaKokkuH1.querySelector(".teinePool").innerHTML = Number(summeeritudSumma).toFixed(2)+" €";
    //console.log("Kogu summa on: "+summeeritudSumma)
    /* oigeKorgus(detailInfoDiv) */;
}

function eemaldaNuppKorgus(){
    var eemalda = document.querySelectorAll(".eemalda");
    if(eemalda.length > 0){
        for (i=0; i<eemalda.length; i++){
            eemalda[i].style.height = "30px";
            eemalda[i].style.width = "30px";
            eemalda[i].style.borderRadius = "30px";
            eemalda[i].style.top = "50%";
            eemalda[i].style.transform = "translateY(-50%)";
            eemalda[i].parentElement.style.paddingRight = "30px";
            eemalda[i].parentElement.style.position = "relative";
            eemalda[i].style.position = "absolute";
            eemalda[i].style.right = "0px";
            // eemalda[i].addEventListener("mouseover",punaseks);
            // eemalda[i].addEventListener("mouseout",punaseksMaha);
            eemalda[i].addEventListener("mouseover",function(){this.parentNode.classList.add("hover")})
            eemalda[i].addEventListener("mouseout",function(){this.parentNode.classList.remove("hover")})
        }
    }
}

function avaHinnad(){
    modalBody.innerHTML = ""
    modalPealkiri.innerHTML = "Hinnatabel";
    modalBody.innerHTML = (
        '<div class="tekstiOsa taisLaius hinnad"><h3>Detailide hinnad:</h3>\
        <span><label for="esiraastalauaHind">Esiräästalaud (RF)'+esiraastalaud+' mm:</label><input type="number" id="esiraastalauaHind" value=""> €</span>\
        <span><label for="papikinnituslauaHind">Papikinnituslauad (EE) '+papikinnituslaud+' mm:</label><input type="number" id="papikinnituslauaHind" value=""> €</span>\
        <span><label for="toelaua38Hind">Toelauad (RR) '+toelaud+' mm:</label><input type="number" id="toelaua38Hind" value=""> €</span>\
        <span><label for="toelaua90Hind">Toelauad (RR) '+toelaudSuurem+' mm:</label><input type="number" id="toelaua95Hind" value=""> €</span>\
        <span><label for="katuselauaHind">Katuselauad:</label><input type="number" id="katuselauaHind" value=""> €</span>\
        <span><label for="parlinHind">Pärlinid:</label><input type="number" id="parlinHind" value=""> €</span>\
        <span><label for="seinalauadHind">Seinalauad:</label><input type="number" id="seinalauadHind" value=""> €</span>\
        <span><label for="porandalauadHind">Põrandalauad:</label><input type="number" id="porandalauadHind" value=""> €</span>\
        <span><label for="vundamentHind">Vundamendi prussid:</label><input type="number" id="vundamentHind" value=""> €</span>\
        <span><label for="tuuleliistHind">Tuuleliistud:</label><input type="number" id="tuuleliistHind" value=""> €</span>\
        </div>\
        <p><input type="button" class="poolNuppu" value="Salvesta hinnad" onClick="salvestaHinnad()"></p>')
        
        if(uksed.length > 0 && aknad.length == 0){
            modalBody.querySelector(".hinnad").innerHTML+= usteHinnad
            for(i=0; i<erinevadSeeriadUks; i++){
                modalBody.querySelector("#uks"+distinctSeeriaUks[i]).value = hinnad["uks"+distinctSeeriaUks[i]].toFixed(2);
            }
        }
        if(aknad.length > 0 && uksed.length == 0){
            modalBody.querySelector(".hinnad").innerHTML+= akendeHinnad;
            for(i=0; i<erinevadSeeriadAken; i++){
                modalBody.querySelector("#aken"+distinctSeeriaAken[i]).value = hinnad["aken"+distinctSeeriaAken[i]].toFixed(2);
            }
        }

        if(aknad.length > 0 && uksed.length > 0){
            modalBody.querySelector(".hinnad").innerHTML+= usteHinnad
            modalBody.querySelector(".hinnad").innerHTML+= akendeHinnad;
            for(i=0; i<erinevadSeeriadUks; i++){
                modalBody.querySelector("#uks"+distinctSeeriaUks[i]).value = hinnad["uks"+distinctSeeriaUks[i]].toFixed(2);
            }
            for(i=0; i<erinevadSeeriadAken; i++){
                modalBody.querySelector("#aken"+distinctSeeriaAken[i]).value = hinnad["aken"+distinctSeeriaAken[i]].toFixed(2);
            }
        }


        
    
    
    modalBody.querySelector("#esiraastalauaHind").value = hinnad.esiraastalaud.toFixed(2); 
    modalBody.querySelector("#papikinnituslauaHind").value = hinnad.papikinnituslaud.toFixed(2); 
    modalBody.querySelector("#toelaua38Hind").value = hinnad.toelaud38.toFixed(2); 
    modalBody.querySelector("#toelaua90Hind").value = hinnad.toelaud95.toFixed(2); 
    modalBody.querySelector("#katuselauaHind").value = hinnad.katuseLauad.toFixed(2)  
    modalBody.querySelector("#parlinHind").value = hinnad.parlinid.toFixed(2)   
    modalBody.querySelector("#seinalauadHind").value = hinnad.seinaLauad.toFixed(2)   
    modalBody.querySelector("#porandalauadHind").value = hinnad.porandaLauad.toFixed(2)  
    modalBody.querySelector("#vundamentHind").value = hinnad.vundament.toFixed(2)  
    modalBody.querySelector("#tuuleliistHind").value = hinnad.tuuleLiist.toFixed(2);
    // if(uksed.length > 0) {   
    
    // }
    // modalBody.querySelector(".info").style.marginTop ="20px";
    modal.style.display = "block";
    var span = document.getElementsByClassName("close")[0];
    // When the user clicks on <span> (x), close the modal
    span.onclick = function() {
        modal.style.display = "none";
    }
    
    // When the user clicks anywhere outside of the modal, close it
    window.onclick = function(event) {
        if (event.target == modal) {
        modal.style.display = "none";
        }
    }

}


function prindi(){
    if(joonestatud == true){
        canvas.style.display = "none";       
        convertCanvasToImage();
        //console.log("DPR on "+window.devicePixelRatio); 
        document.querySelector(".clear").innerHTML = "Arvutatud kasutades www.logcalc.ee";   
        setTimeout(window.print, 100)
    }

}

function salvestaHinnad(){
    modal.style.display = "none";
    hinnad.esiraastalaud = Number(modalBody.querySelector("#esiraastalauaHind").value); 
    hinnad.papikinnituslaud = Number(modalBody.querySelector("#papikinnituslauaHind").value); 
    hinnad.toelaud38 = Number(modalBody.querySelector("#toelaua38Hind").value); 
    hinnad.toelaud95 = Number(modalBody.querySelector("#toelaua95Hind").value); 
    hinnad.katuseLauad = Number(modalBody.querySelector("#katuselauaHind").value);
    hinnad.parlinid = Number(modalBody.querySelector("#parlinHind").value);   
    hinnad.seinaLauad = Number(modalBody.querySelector("#seinalauadHind").value);   
    hinnad.porandaLauad = Number(modalBody.querySelector("#porandalauadHind").value);  
    hinnad.vundament = Number(modalBody.querySelector("#vundamentHind").value);  
    hinnad.tuuleLiist = Number(modalBody.querySelector("#tuuleliistHind").value);
    if(uksed.length > 0){
        usteHindSalvestatud = true;
        for(i=0; i<erinevadSeeriadUks; i++){
            hinnad["uks"+distinctSeeriaUks[i]] = Number(modalBody.querySelector("#uks"+distinctSeeriaUks[i]).value);
        }
    }
    if(aknad.length > 0){
        akendeHindSalvestatud = true;
        for(i=0; i<erinevadSeeriadAken; i++){
            hinnad["aken"+distinctSeeriaAken[i]] = Number(modalBody.querySelector("#aken"+distinctSeeriaAken[i]).value);
        }
    }

    if(arvutaTulemusedArvutatud == true){arvuta2()};
    if(vundamentArvutatud == true){lisaPorandVundament()};
    if(porandArvutatud == true){lisaPorandVundament()};
    if(katusArvutatud == true){lisakatusKirjuta()};
    if(parlinArvutatud == true){lisaParlinKirjuta()};
    if(uksed.length > 0){usteInfoDetailidesse()};
    if(aknad.length > 0){akendeInfoDetailidesse()};
    vundamentPorandHind()

    summeeritudSumma = 0;
    summeeritudSumma = servalauadSummaKokku+katuseLauadSummaKokku+parlinSummaKokku+jooksvadMeetridSummaKokku+vundmendiSummaKokku+porandaSummaKokku+tuuleliistudSummaKokku+usteSummaKokku+akendeSummaKokku;
    let summaKokkuH1 = document.querySelector(".summaKokku");
    if(summaKokkuH1){
        summaKokkuH1.querySelector(".teinePool").innerHTML = Number(summeeritudSumma).toFixed(2)+" €";
    }
}
function sulge(){
    modal.style.display = "none";
}

//! Ajutine
function detailInfo2() {
    modalBody.innerHTML = ""
    modalPealkiri.innerHTML = "Detailne info";
    modalBody.innerHTML = (
        '<div class="tekstiOsa taisLaius hinnad">\
        <div class="ymbris">\
        <ul class="pindala3Info"></ul>\
        <ul class="gablePalgid3Info"></ul>\
        <ul class="jooksvadMeetrid3Info"></ul>\
        <ul class="pikemadLauad3Info"></ul>\
        <ul class="uksed3Info"></ul>\
        <ul class="aknad3Info"></ul>\
        <ul class="vundament3Info"></ul>\
        <ul class="porand3Info"></ul>\
        <ul class="katus3Info"></ul>\
        <ul class="parlin3Info"></ul>\
    </div>\
        </div>\
        <p><input type="button" class="poolNuppu" value="Sulge detailne info" onClick="sulge()"></p>')

    var pindala3Info = document.querySelector(".pindala3Info");
    var gablePalgid3Info = document.querySelector(".gablePalgid3Info");
    var jooksvadMeetrid3Info = document.querySelector(".jooksvadMeetrid3Info");
    var pikemadLauad3Info = document.querySelector(".pikemadLauad3Info");
    var uksed3Info = document.querySelector(".uksed3Info");
    var aknad3Info = document.querySelector(".aknad3Info");
    var vundament3Info = document.querySelector(".vundament3Info");
    var porand3Info = document.querySelector(".porand3Info");
	var katus3Info = document.querySelector(".katus3Info");
	var parlin3Info = document.querySelector(".parlin3Info");
    if(pindala3Info.innerHTML != ""){pindala3Info.innerHTML = ""};
    if(gablePalgid3Info.innerHTML != ""){gablePalgid3Info.innerHTML = ""};
    if(jooksvadMeetrid3Info.innerHTML != ""){jooksvadMeetrid3Info.innerHTML = ""};
    if(pikemadLauad3Info.innerHTML != ""){pikemadLauad3Info.innerHTML = ""};
    if(uksed3Info.innerHTML != ""){uksed3Info.innerHTML = ""};
    if(aknad3Info.innerHTML != ""){aknad3Info.innerHTML = ""};
    if(vundament3Info.innerHTML != ""){vundament3Info.innerHTML = ""};
    if(porand3Info.innerHTML != ""){porand3Info.innerHTML = ""};
	if(katus3Info.innerHTML != ""){katus3Info.innerHTML = ""};
	if(parlin3Info.innerHTML != ""){parlin3Info.innerHTML =""};
    
    if(viilKatus){
        pindala3Info.innerHTML += "<li>Esi ja tagaseina pindala: "+Number(seinaPindala1).toFixed(2)+" m<sup>2</sup></li>";
        pindala3Info.innerHTML += "<li>Esi ja tagaseina jm: "+Number(seinaPindala1jm).toFixed(2)+" m<sup>2</sup></li>";
        pindala3Info.innerHTML += "<li>Küljeseinte pindala: "+Number(seinaPindala2).toFixed(2)+" m<sup>2</sup></li>";
        pindala3Info.innerHTML += "<li>Küljeseinte lauad kõrgusega "+palgiKorgus+"mm jm: "+Number(seinaPindala2jm).toFixed(2)+" jm</li>";
        pindala3Info.innerHTML += "<li>Katuse kolmnurkade pindala: "+Number(katuseKolmnurk*2).toFixed(2)+" m<sup>2</sup></li>";
    }else{
        pindala3Info.innerHTML += "<li>Esiseina pindala: "+Number(seinaPindalaEest).toFixed(2)+"m<sup>2</sup></li>"
        pindala3Info.innerHTML += "<li>Esiseina jm: "+Number(seinaPindala1jm).toFixed(2)+"m<sup>2</sup></li>"
        pindala3Info.innerHTML += "<li>Tagaseina pindala: "+Number(seinapindalaTaga).toFixed(2)+"m<sup>2</sup></li>"
        pindala3Info.innerHTML += "<li>Tagaseina jm: "+Number(seinaPindala2jm).toFixed(2)+"m<sup>2</sup></li>"
        pindala3Info.innerHTML += "<li>Küljesinte pindala: "+Number(seinapindalaKylg).toFixed(2)+"m<sup>2</sup></li>"
        pindala3Info.innerHTML += "<li>Küljeseinte lauad kõrgusega "+palgiKorgus+"mm jm: "+Number(seinaPindala3jm).toFixed(2)+" jm</li>";
        pindala3Info.innerHTML += "<li>Küljeseinte kolmnurkade pindala: "+Number(kolmnurk3*2).toFixed(2)+" m<sup>2</sup></li>";
    }

    gablePalgid3Info.innerHTML += gablePalgid2Info;
    gablePalgid3Info.innerHTML += "<li>Palkide kogu pikkus kokku on: "+Number(palgiPikkusKokku).toFixed(2)+" mm</li>";
    jooksvadMeetrid3Info.innerHTML += "<li>Gable jooksvad meetrid on: "+gableJooksevMeeter+" m</li>";
    jooksvadMeetrid3Info.innerHTML += "<li>Ilma Gable-ta: "+Number(jooksevMeeter-gableJooksevMeeter-uksedJooksvadMeetrid-aknadJooksvadMeetrid).toFixed(2)+" m</li>";
    jooksvadMeetrid3Info.innerHTML += "<li>Jooksvad meetrid koos Gable-ga: "+Number(jooksevMeeter).toFixed(2)+" m</li>";
    //siia tuleb lisada count ˇˇˇˇˇ
    if(pikemadLauadArv>0){pikemadLauad3Info.innerHTML += "<li>Pikemaid laudu kõrgusega"+Math.max.apply(this, pikemLaudKorgem)+" mm on: "+pikemadLauadArv+" tk</li>";
    pikemadLauad3Info.innerHTML += "<li>Pikemad lauad kõrgusega "+Math.max.apply(this, pikemLaudKorgem)+" mm jm: "+Number(pikemadLauadJooksvadMeetrid).toFixed(2)+" m</li>";}
    if(pikemadLauad114Arv>0){pikemadLauad3Info.innerHTML += "<li>Pikemaid laudu kõrgusega "+String.fromCharCode(8804)+" 114mm on "+pikemadLauad114Arv+" tk</li>";
    pikemadLauad3Info.innerHTML += "<li>Pikemad lauad kõrgusega "+String.fromCharCode(8804)+" 114mm on "+pikemadLauad114jm+" m</li>"};
    if(uksedJooksvadMeetrid>0){uksed3Info.innerHTML += "<li>Uste poolt hõlmatav pindala: "+Number(uksedKokkuPindala).toFixed(2)+" m<sup>2</sup></li>";
    uksed3Info.innerHTML += "<li>Jooksvates meetrites: "+uksedJooksvadMeetrid+" m</li>";}
    if(aknadJooksvadMeetrid>0){aknad3Info.innerHTML += "<li>Akende poolt hõlmatav pindala on: "+Number(aknadKokkuPindala).toFixed(2)+" m<sup>2</sup></li>"
    aknad3Info.innerHTML += "<li>Aknaava jooksvates meetrites: "+aknadJooksvadMeetrid+" m</li>"}
    if(vundamendiKulu>0){vundament3Info.innerHTML += "<li>Kasutatakse vundamenti mõõtmetega: "+vundament[0]["laius"]+"x"+vundament[0]["korgus"]+" mm</li>"
    vundament3Info.innerHTML += "<li>Vundamendi kulu on: "+vundamendiKulu+" jm</li>";}
    if(porandaLaudadeArv>0){porand3Info.innerHTML += "<li>Põrandalaudade arv on "+porandaLaudadeArv+" tk</li>"
    porand3Info.innerHTML += "<li>Põrandalaudade kulu on "+porandaLaudJm+" jm</li>"}
    if(katuseLaudadeArv>0){katus3Info.innerHTML += "<li>Katuselaudade arv on "+katuseLaudadeArv+" tk</li>";
    if(katuseLauaPikkus ==0){
        katus3Info.innerHTML += "<li>Katuselaudede kulu on "+Number(katuseLaudadeArv*katuseLauaPikkusArvutuslik/1000).toFixed(1)+" jm</li>"
    }else{
        katus3Info.innerHTML += "<li>Katuselaudede kulu on "+Number(katuseLaudadeArv*katuseLauaPikkus/1000).toFixed(1)+" jm</li>"
    }
        katus3Info.innerHTML += "<li>Katuse nurk on "+Number(katuseNurk3).toFixed(1)+String.fromCharCode(176)+"</li>"
    } 
    if(tipuParlin == true){
        parlin3Info.innerHTML += "<li>Pärlinite kogus:  1 tipupärlin</li>"
        parlin3Info.innerHTML += "<li>Pärlini kulu on "+Number(1*parlinPikkus/1000).toFixed(1)+" jm</li>"
    }else{

    
    if(parlinVahe > 0){
		if(parlinArv == 0){
			parlin3Info.innerHTML += "<li>Pärlinite kogus: "+parlinArvArvutuslik*2+" tk + 1 tipupärlin</li>"
			parlin3Info.innerHTML += "<li>Pärlinite vahe on "+Number(parlinVahe).toFixed(1)+" mm</li>"
			parlin3Info.innerHTML += "<li>Pärlinite kulu (koos tipupärliniga) on "+Number(((parlinArvArvutuslik*2+1)*parlinPikkus/1000)).toFixed(1)+" jm</li>"
		}else{
			parlin3Info.innerHTML += "<li>Pärlinite kogus: "+parlinArv*2+" tk + 1 tipupärlin</li>"
			parlin3Info.innerHTML += "<li>Pärlinite vahe on "+Number(parlinVahe).toFixed(1)+" mm</li>"
			parlin3Info.innerHTML += "<li>Pärlinite kulu (koos tipupärliniga) on "+Number(((parlinArv*2+1)*parlinPikkus/1000)).toFixed(1)+" jm</li>"

		}
    }}
    
    modal.style.display = "block";
    var span = document.getElementsByClassName("close")[0];
    // When the user clicks on <span> (x), close the modal
    span.onclick = function() {
        modal.style.display = "none";
    }
    
    // When the user clicks anywhere outside of the modal, close it
    window.onclick = function(event) {
        if (event.target == modal) {
        modal.style.display = "none";
        }
    }

}
function sisendAndmed(){

    if(viilKatus){
        if (document.querySelector("#cab_width").value > 0 && document.querySelector("#cab_depth").value > 0 && document.querySelector("#cab_height_side").value > 0 && document.querySelector("#cab_height_fb").value > 0 && document.querySelector("#cab_roofHeight").value > 0 && document.querySelector("#palgiPaksus").value > 0 && document.querySelector("#palgiKorgus").value > 0){
            joonesta();
            if(vundamentArvutatud == true){lisaPorandVundament()};
            if(porandArvutatud == true){lisaPorandVundament()};
            if(katusArvutatud == true){lisaKatus2()};
            if(parlinArvutatud == true){lisaParlin2()};
            if(uksed.length > 0){usteInfoDetailidesse()};
            if(aknad.length > 0){akendeInfoDetailidesse()};
            document.querySelector("#kaldenurk").innerText = " "+Number(arvutaKatuseNurk()).toFixed(2)+String.fromCharCode(176)
        }

    }else{
        if (document.querySelector("#cab_width").value > 0 && document.querySelector("#cab_depth").value > 0 && document.querySelector("#cab_height_fb").value > 0 && document.querySelector("#cab_roofHeight").value > 0 && document.querySelector("#palgiPaksus").value > 0 && document.querySelector("#palgiKorgus").value > 0){
            joonesta();
            if(vundamentArvutatud == true){lisaPorandVundament()};
            if(porandArvutatud == true){lisaPorandVundament()};
            if(katusArvutatud == true){lisaKatus2()};
            if(parlinArvutatud == true){lisaParlin2()};
            if(uksed.length > 0){usteInfoDetailidesse()};
            if(aknad.length > 0){akendeInfoDetailidesse()};
            let yksKalle = document.querySelector(".yksKalle")
            yksKalle.innerHTML = "<span style='position: relative;top:50%;transform: translateY(-50%)'>Katusekalle "+Number(arvutaKatuseNurk()).toFixed(2)+String.fromCharCode(176)+"<span></li>"
            yksKalle.style.display = "block"
        }    
    }
    
}

function punaseks(){
    this.parentNode.classList.add("hover");
}

function punaseksMaha(){
    this.parentNode.classList.remove("hover");
}

function piltKatus(){
    if(document.querySelector("#cab_roofHeight").value > 0){
        if(viilKatus){
            a.contentDocument.getElementById("viil").style.display = "block";
        }else{
            a.contentDocument.getElementById("tagasein").style.display = "block";
        }
    }else{
        if(viilKatus){
            a.contentDocument.getElementById("viil").style.display = "none";
        }else{
            a.contentDocument.getElementById("tagasein").style.display = "none";
        }
    }
}

function piltEsiTagu(){
    if(document.querySelector("#cab_height_fb").value > 0 ){
        if(viilKatus){
            a.contentDocument.getElementById("otsaseinad").style.display = "block";
        }else{
            a.contentDocument.getElementById("esisein").style.display = "block";
        }
    }else{
        if(viilKatus){
            a.contentDocument.getElementById("otsaseinad").style.display = "none";
        }else{
            a.contentDocument.getElementById("esisein").style.display = "none";
        }    }

}

function piltKulje(){
    if(document.querySelector("#cab_height_side").value > 0){
        if(viilKatus) {
            a.contentDocument.getElementById("kyljeseinad").style.display = "block";
        }else{
            a.contentDocument.getElementById("kyljeseinad").style.display = "block";
        }
    }else{
        if(viilKatus) {
            a.contentDocument.getElementById("kyljeseinad").style.display = "none";
        }else{
            a.contentDocument.getElementById("tagasein").style.display = "block";
        }
    }

}

window.addEventListener("beforeprint", function(event) {
    if(joonestatud == true){
        canvas.style.display = "none";       
        convertCanvasToImage();
        //console.log("DPR on "+window.devicePixelRatio);
        document.querySelector(".clear").innerHTML = "Arvutatud kasutades www.logcalc.ee";
    } 
});

/* window.onbeforeprint = function() {

    if(joonestatud == true){
        canvas.style.display = "none";       
        convertCanvasToImage();
        //console.log("DPR on "+window.devicePixelRatio);
    }

};
 */
window.onafterprint = function() {
    if(joonestatud == true){
        document.getElementById("prindiPilt").innerHTML = "";
        canvas.style.display = "block" 
        document.querySelector(".clear").innerHTML = ""  
    }
};


function fix_dpi() {
    //get CSS height
    //the + prefix casts it to an integer
    //the slice method gets rid of "px"
    let style_height = +getComputedStyle(canvas).getPropertyValue("height").slice(0, -2);
    //get CSS width
    let style_width = +getComputedStyle(canvas).getPropertyValue("width").slice(0, -2);
    //scale the canvas
    canvas.setAttribute('height', style_height * dpi);
    canvas.setAttribute('width', style_width * dpi);
    //console.log("DPI PARANDATUD!!!!");
}

function convertCanvasToImage() {
    document.getElementById("canvas").style.width = "1900px"
    setCanvasHeight(1900);
    joonesta(50);
    var toDataUrl = canvas.toDataURL();
    //console.log(toDataUrl)
    document.getElementById("prindiPilt").innerHTML = "<img width='475px' src='"+toDataUrl+"'/>"
    document.getElementById("prindiPilt").style.marginLeft = "12.5px"
    document.getElementById("canvas").style.width = "475px"
    setCanvasHeight(475);
    joonesta();
}

function andmedSisse (){
    if(viilKatus){
        document.getElementById("cab_width").value = 3800;
        document.getElementById("cab_depth").value = 3800;
        document.getElementById("cab_height_side").value = 2052;
        document.getElementById("cab_height_fb").value = 1995;
        document.getElementById("cab_roofHeight").value = 2565;
        document.getElementById("palgiPaksus").value = 40;
        document.getElementById("palgiKorgus").value = 11;
        document.getElementById("palgiKorgus").focus();
    }else{
        alert("Annika I 28 mm, andmed sisestatud!")
        document.getElementById("cab_width").value = 2900;
        document.getElementById("cab_depth").value = 2000;
        document.getElementById("cab_height_fb").value = 2109;
        document.getElementById("cab_roofHeight").value = 1881;
        document.getElementById("palgiPaksus").value = 28;
        document.getElementById("palgiKorgus").value = 11;
        document.getElementById("palgiKorgus").focus();
    }

    // document.getElementById("palgiKorgus").value = 114;
}

function valiKatuseTyyp(){
    
    modalBody.innerHTML = ""
    modalPealkiri.innerHTML = "Vali katuse tüüp";
    modalBody.innerHTML = (
        `
        <div class="keskele tyyp">
            <input id="viilkatus" type="button" class="viilkatus" value="Viilkatus" onClick='katuseTyyp("viil")'>
            <input id="kaldkatus" type="button" class="yhekaldne" value="Ühekaldeline katus" onClick='katuseTyyp("yhekaldne")'>
        </div>
        `)
    modal.style.display = "block";
    var span = document.getElementsByClassName("close")[0];
    // When the user clicks on <span> (x), close the modal
    span.onclick = function() {
        alert("Palun valige katusetüüp")
    }

    // When the user clicks anywhere outside of the modal, close it
    /* window.onclick = function(event) {
      if (event.target == modal) {
        modal.style.display = "none";
      }
        
    } */
}

function katuseTyyp(katus){
    window[katus+"Katus"] = true;
    //console.log(viilKatus)
    //console.log(yhekaldneKatus)
    modal.style.display = "none";
    muudaNupud();
    if(viilKatus){
        url = "../GjA8binTNAvhzHMT.php/records/eelSalvestatudMajaSadulViktra/"
    }else{
        url = "../GjA8binTNAvhzHMT.php/records/eelSalvestatudMajaYhekaldelineViktra/"
    }    
    getData()
}

function muudaNupud(){
    if(yhekaldneKatus){
        document.querySelector("li.h_side").style.display = "none"
        document.querySelector("label.cab_height_fb").innerText = "Esiseina kõrgus (mm)"
        document.querySelector("label.cab_roofHeight").innerText = "Tagaseina kõrgus (mm)"
        document.querySelector("div.cab_roofHeight").style.backgroundImage = "url(./img/backwall2_height.svg)"
        document.querySelector("div.cab_height_fb").style.backgroundImage = "url(./img/backwall_height_yhekaldne.svg)"
        document.querySelector("object").data = "img/3D_lamekatuspildid.svg"
    }

}

var dataArrayKaldu

function setDataToArray(data){
    dataArrayKaldu = data['records']
    //console.log("DataArray", dataArrayKaldu)
}
var url


const sendHttpRequest = (method, url, data) => {
    const promise = new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open(method, url);
  
      xhr.responseType = 'json';
  
      if (data) {
        xhr.setRequestHeader('Content-Type', 'application/json');
      }
  
      xhr.onload = () => {
        if (xhr.status >= 400) {
          reject(xhr.response);
        } else {
          resolve(xhr.response);
        }
      };
  
      xhr.onerror = () => {
        reject('Something went wrong!');
      };
  
      xhr.send(JSON.stringify(data));
    });
    return promise;
  };

  
  
  const getData = (id) => {

    sendHttpRequest('GET', url+(id ? id : "")).then(responseData => {
      //console.log(responseData);
      setDataToArray(responseData)
    });
  };
  
  const sendData = (data) => {
    sendHttpRequest('POST', url, data )
      .then(responseData => {
        //console.log(responseData);
      })
      
      .catch(err => {
        //console.log(err);
      });
  };
  const putData = (id, data) => {
    sendHttpRequest('PUT', url+id, data )
      .then(responseData => {
        //console.log(responseData);
      })
      
      .catch(err => {
        //console.log(err);
      });
  };

  const deleteData = (id) => {
      sendHttpRequest('DELETE', url+id)
      .then(responseData => {
          //console.log(responseData)
      })
      .then(getData())
      .then(nimekiriInfo(id, true))
      .catch(err => {
        //console.log(err)
      })
  }

  const avaMajadeNimekiri = () => {
    modalBody.innerHTML = ""
    modalPealkiri.innerHTML = "Majade nimekiri"
    modalPealkiri.innerHTML += viilKatus ? " / viilkatusega" : " / ühekaldelised"
    var loopBody = ""
    loopBody += '<div class="taisLaius"><h3>Majade nimekiri:</h3>'
    
        if(dataArrayKaldu.length){
            
            
            for (let i = 0; i < dataArrayKaldu.length; i++) {
                const element = dataArrayKaldu[i];
                if(i == 0){loopBody += "<ul class='majadeNimekiri'>"}
                loopBody += "<li >"+element['majaNimi']+"<span class='lisaks'>"+((element['pikemadLauad'] ? "|pikemadlauad|": "" )+(element['uksed'] ? "|uksed|": "" )+(element['aknad'] ? "|aknad|": "" )+(element['vundament'] ? "|vundament|": "" )+(element['porand'] ? "|põrand|": "" )+(element['parlin'] ? "|pärlin|": "" )+(element['katus'] ? "|katus|": "" ))+"</span><span style='float: right'><span onClick='kasutaAndmeidKaldu("+i+")'>Kasuta</span><span onClick='majaAndmed("+i+")'>Muuda</span><span onClick='deleteData("+dataArrayKaldu[i]["Id"]+", true)'>Kustuta</span></span></li>"
                if(i == dataArrayKaldu.length -1){loopBody += "</ul>"}
            }
        

        }
    
    loopBody+= '</div>'
    loopBody+= '<p><input  class="lisaMaja" type="button" value="Lisa uus" onClick="majaAndmed()"><input class="lisaMaja" type="button" value="Sulge" onClick="sulge()"></p>'
    modalBody.innerHTML = loopBody
    
   
        

    
    modal.style.display = "block";
    var span = document.getElementsByClassName("close")[0];
    // When the user clicks on <span> (x), close the modal
    span.onclick = function() {
        modal.style.display = "none";
    }
    
    // When the user clicks anywhere outside of the modal, close it
    window.onclick = function(event) {
        if (event.target == modal) {
        modal.style.display = "none";
        }
    }
}

const majaAndmed = (id) => {
    modalBody.innerHTML = ""
    modalPealkiri.innerHTML = id != undefined || id != null ? "Muuda maja" : "Lisa maja"
    if(id != undefined || id != null){

        let majaNimi = dataArrayKaldu[id]["majaNimi"]
        let laius = dataArrayKaldu[id]["laius"]
        let pikkus = dataArrayKaldu[id]["pikkus"]
        let kyljeseinaKorgus
        let esiTagaKorgus
        let katusKorgus
        let esiseinaKorgus
        let tagaseinaKorgus

        if(viilKatus){
            kyljeseinaKorgus = dataArrayKaldu[id]["kyljeseinaKorgus"]
            esiTagaKorgus = dataArrayKaldu[id]["esiTagaKorgus"]
            katusKorgus = dataArrayKaldu[id]["katusKorgus"]
        }else{
            esiseinaKorgus = dataArrayKaldu[id]["esiseinaKorgus"]
            tagaseinaKorgus = dataArrayKaldu[id]["tagaseinaKorgus"]
        }

        let palgiPaksus = dataArrayKaldu[id]["palgiPaksus"]
        let palgiKorgus = dataArrayKaldu[id]["palgiKorgus"]
        var body = ""
        

        if(viilKatus){
            body += `
            <div class="tekstiOsa taisLaius hinnad" style="margin-top: 20px">
                <span><label for="majaNimi">Nimi:</label><input style="width: 100px" type="text" id="majaNimi" value="`+majaNimi+`"></span>
                <span><label for="laius">Laius:</label><input type="number" id="laius" value="`+laius+`"></span>
                <span><label for="pikkus">Pikkus:</label><input type="number" id="pikkus" value="`+pikkus+`"></span>
                <span><label for="kyljeseinaKorgus">Küljeseina kõrgus:</label><input type="number" id="kyljeseinaKorgus" value="`+kyljeseinaKorgus+`"></span>
                <span><label for="esiTagaKorgus">Esi/tagaseina kõrgus:</label><input type="number" id="esiTagaKorgus" value="`+esiTagaKorgus+`"></span>
                <span><label for="katusKorgus">Katuse kõrgus:</label><input type="number" id="katusKorgus" value="`+katusKorgus+`"></span>
                <span><label for="palgiPaksus">Palgi paksus:</label><input type="number" id="palgiPaksus" value="`+palgiPaksus+`"></span>
                <span><label for="palgiKorgus">Palgi kõrgus:</label><input type="number" id="palgiKorgus" value="`+palgiKorgus+`"></span>
            </div>`
        }else{
            body += `
            <div class="tekstiOsa taisLaius hinnad" style="margin-top: 20px">
                <span><label for="majaNimi">Nimi:</label><input style="width: 100px" type="text" id="majaNimi" value="`+majaNimi+`"></span>
                <span><label for="laius">Laius:</label><input type="number" id="laius" value="`+laius+`"></span>
                <span><label for="pikkus">Pikkus:</label><input type="number" id="pikkus" value="`+pikkus+`"></span>
                <span><label for="esiseinaKorgus">Esiseina kõrgus:</label><input type="number" id="esiseinaKorgus" value="`+esiseinaKorgus+`"></span>
                <span><label for="tagaseinaKorgus">Tagaseina kõrgus:</label><input type="number" id="tagaseinaKorgus" value="`+tagaseinaKorgus+`"></span>
                <span><label for="palgiPaksus">Palgi paksus:</label><input type="number" id="palgiPaksus" value="`+palgiPaksus+`"></span>
                <span><label for="palgiKorgus">Palgi kõrgus:</label><input type="number" id="palgiKorgus" value="`+palgiKorgus+`"></span>
            </div>`
        }





        modalBody.innerHTML = body


        
        modalBody.innerHTML += `<p><input type="button" class="lisaMaja" value="Uuenda" onClick="manipulateData(`+id+`)"><input type="button" class="lisaMaja kustuta" value="Kustuta" onClick="manipulateData(`+id+`, true)"><input class="lisaMaja" type="button" value="Tagasi" onClick="avaMajadeNimekiri()"></p>`
        

        
    }else{
        let body
        if(viilKatus){
            body = `
            <div class="tekstiOsa taisLaius hinnad" style="margin-top: 20px">
                <span><label for="majaNimi">Nimi:</label><input style="width: 100px" type="text" id="majaNimi" value=""></span>
                <span><label for="laius">Laius:</label><input type="number" id="laius" value=""></span>
                <span><label for="pikkus">Pikkus:</label><input type="number" id="pikkus" value=""></span>
                <span><label for="kyljeseinaKorgus">Küljeseina kõrgus:</label><input type="number" id="kyljeseinaKorgus" value=""></span>
                <span><label for="esiTagaKorgus">Esi/tagaseina kõrgus:</label><input type="number" id="esiTagaKorgus" value=""></span>
                <span><label for="katusKorgus">Katuse kõrgus:</label><input type="number" id="katusKorgus" value=""></span>
                <span><label for="palgiPaksus">Palgi paksus:</label><input type="number" id="palgiPaksus" value=""></span>
                <span><label for="palgiKorgus">Palgi kõrgus:</label><input type="number" id="palgiKorgus" value=""></span>
            </div>
            `
        }else{
            body = `
            <div class="tekstiOsa taisLaius hinnad" style="margin-top: 20px">
                <span><label for="majaNimi">Nimi:</label><input style="width: 100px" type="text" id="majaNimi" value=""></span>
                <span><label for="laius">Laius:</label><input type="number" id="laius" value=""></span>
                <span><label for="pikkus">Pikkus:</label><input type="number" id="pikkus" value=""></span>
                <span><label for="esiseinaKorgus">Esiseina kõrgus:</label><input type="number" id="esiseinaKorgus" value=""></span>
                <span><label for="tagaseinaKorgus">Tagaseina kõrgus:</label><input type="number" id="tagaseinaKorgus" value=""></span>
                <span><label for="palgiPaksus">Palgi paksus:</label><input type="number" id="palgiPaksus" value=""></span>
                <span><label for="palgiKorgus">Palgi kõrgus:</label><input type="number" id="palgiKorgus" value=""></span>
            </div>
            `
        }

        modalBody.innerHTML = body
        modalBody.innerHTML += `<p><input type="button" class="lisaMaja" value="Salvesta" onClick="manipulateData()"><input class="lisaMaja"  type="button" value="Tagasi" onClick="avaMajadeNimekiri()">`+ document.querySelector("ul.sisendandmed").querySelector("#palgiKorgus").value == ""  ? `<p><input type="button" class="lisaMaja" value="Salvesta" onClick="manipulateData()"><input class="lisaMaja"  type="button" value="Tagasi" onClick="avaMajadeNimekiri()"></p>` : `<p><input type="button" class="lisaMaja" value="Salvesta" onClick="manipulateData()"><input class="lisaMaja"  type="button" value="Tagasi" onClick="avaMajadeNimekiri()"><input class="lisaMaja" style="width: 150px"  type="button" value="Loe andmed sisse" onClick="loeAndmedSisse()">`
    }



    modal.style.display = "block";
    var span = document.getElementsByClassName("close")[0];
    // When the user clicks on <span> (x), close the modal
    span.onclick = function() {
        modal.style.display = "none";
    }
    
    // When the user clicks anywhere outside of the modal, close it
    window.onclick = function(event) {
        if (event.target == modal) {
        modal.style.display = "none";
        }
    }
    
}

const loeAndmedSisse = () => {
    modalBody.querySelector("#laius").value = document.querySelector("ul.sisendandmed").querySelector("#cab_width").value
    modalBody.querySelector("#pikkus").value = document.querySelector("ul.sisendandmed").querySelector("#cab_depth").value
    if(viilKatus){
        modalBody.querySelector("#kyljeseinaKorgus").value = document.querySelector("ul.sisendandmed").querySelector("#cab_height_side").value
        modalBody.querySelector("#esiTagaKorgus").value = document.querySelector("ul.sisendandmed").querySelector("#cab_height_fb").value
        modalBody.querySelector("#katusKorgus").value = document.querySelector("ul.sisendandmed").querySelector("#cab_roofHeight").value
    }else{
        modalBody.querySelector("#esiseinaKorgus").value = document.querySelector("ul.sisendandmed").querySelector("#cab_height_fb").value
        modalBody.querySelector("#tagaseinaKorgus").value = document.querySelector("ul.sisendandmed").querySelector("#cab_roofHeight").value

    }

    modalBody.querySelector("#palgiPaksus").value = document.querySelector("ul.sisendandmed").querySelector("#palgiPaksus").value
    modalBody.querySelector("#palgiKorgus").value = document.querySelector("ul.sisendandmed").querySelector("#palgiKorgus").value
}

const manipulateData = (id, kustuta) => {

    let majaNimiValue = modalBody.querySelector("#majaNimi").value
    let laiusValue = modalBody.querySelector("#laius").value
    let pikkusValue = modalBody.querySelector("#pikkus").value
    let kyljeseinaKorgusValue
    let esiTagaKorgusValue
    let katusKorgusValue
    let esiseinaKorgusValue
    let tagaseinaKorgusValue

    if(viilKatus){
        kyljeseinaKorgusValue = modalBody.querySelector("#kyljeseinaKorgus").value
        esiTagaKorgusValue = modalBody.querySelector("#esiTagaKorgus").value
        katusKorgusValue = modalBody.querySelector("#katusKorgus").value
    }else{
        esiseinaKorgusValue = modalBody.querySelector("#esiseinaKorgus").value
        tagaseinaKorgusValue = modalBody.querySelector("#tagaseinaKorgus").value
    }



    let palgiPaksusValue = modalBody.querySelector("#palgiPaksus").value
    let palgiKorgusValue = modalBody.querySelector("#palgiKorgus").value

    if(id != undefined || id != null){
        if(kustuta == undefined || kustuta == null){
            if(viilKatus){
                putData(dataArrayKaldu[id]["Id"], {majaNimi: majaNimiValue, laius: laiusValue, pikkus: pikkusValue, kyljeseinaKorgus: kyljeseinaKorgusValue, esiTagaKorgus: esiTagaKorgusValue, katusKorgus: katusKorgusValue, palgiPaksus: palgiPaksusValue, palgiKorgus: palgiKorgusValue, pikemadLauad: pikemadLauad.length > 0 ? JSON.stringify(pikemadLauad) : "", uksed: uksed.length > 0 ? JSON.stringify(uksed) : "", aknad: aknad.length > 0 ? JSON.stringify(aknad) : "", vundament: vundament.length > 0 ? JSON.stringify(vundament) : "", porandalauad: porand.length > 0 ? JSON.stringify(porand) : "", parlin: parlin.length > 0 ? JSON.stringify(parlin) : "", katus: katus.length > 0 ? JSON.stringify(katus) : "" })
            }else{
                putData(dataArrayKaldu[id]["Id"], {majaNimi: majaNimiValue, laius: laiusValue, pikkus: pikkusValue, esiseinaKorgus: esiseinaKorgusValue, tagaseinaKorgus: tagaseinaKorgusValue, katusKorgus: katusKorgusValue, palgiPaksus: palgiPaksusValue, palgiKorgus: palgiKorgusValue, pikemadLauad: pikemadLauad.length > 0 ? JSON.stringify(pikemadLauad) : "", uksed: uksed.length > 0 ? JSON.stringify(uksed) : "", aknad: aknad.length > 0 ? JSON.stringify(aknad) : "", vundament: vundament.length > 0 ? JSON.stringify(vundament) : "", porandalauad: porand.length > 0 ? JSON.stringify(porand) : "", parlin: parlin.length > 0 ? JSON.stringify(parlin) : "", katus: katus.length > 0 ? JSON.stringify(katus) : "" })
            }

        }else{
            deleteData(dataArrayKaldu[id]["Id"])
        }

    
    } else {
        if(viilKatus){
            sendData({majaNimi: majaNimiValue, laius: laiusValue, pikkus: pikkusValue, kyljeseinaKorgus: kyljeseinaKorgusValue, esiTagaKorgus: esiTagaKorgusValue, katusKorgus: katusKorgusValue, palgiPaksus: palgiPaksusValue, palgiKorgus: palgiKorgusValue, pikemadLauad: pikemadLauad.length > 0 ? JSON.stringify(pikemadLauad) : "", uksed: uksed.length > 0 ? JSON.stringify(uksed) : "", aknad: aknad.length > 0 ? JSON.stringify(aknad) : "", vundament: vundament.length > 0 ? JSON.stringify(vundament) : "", porandalauad: porand.length > 0 ? JSON.stringify(porand) : "", parlin: parlin.length > 0 ? JSON.stringify(parlin) : "", katus: katus.length > 0 ? JSON.stringify(katus) : "" }) 
        }else{
            sendData({majaNimi: majaNimiValue, laius: laiusValue, pikkus: pikkusValue, esiseinaKorgus: esiseinaKorgusValue, tagaseinaKorgus: tagaseinaKorgusValue, katusKorgus: katusKorgusValue, palgiPaksus: palgiPaksusValue, palgiKorgus: palgiKorgusValue, pikemadLauad: pikemadLauad.length > 0 ? JSON.stringify(pikemadLauad) : "", uksed: uksed.length > 0 ? JSON.stringify(uksed) : "", aknad: aknad.length > 0 ? JSON.stringify(aknad) : "", vundament: vundament.length > 0 ? JSON.stringify(vundament) : "", porandalauad: porand.length > 0 ? JSON.stringify(porand) : "", parlin: parlin.length > 0 ? JSON.stringify(parlin) : "", katus: katus.length > 0 ? JSON.stringify(katus) : "" }) 
        }

    }

    nimekiriInfo(id, kustuta)
    
    
    
}

const kasutaAndmeidKaldu = (id) => {
    //console.log("Kasutatavad andmed: ", dataArrayKaldu[id])
    document.querySelector("ul.sisendandmed").querySelector("#cab_width").value = dataArrayKaldu[id]["laius"]
    document.querySelector("ul.sisendandmed").querySelector("#cab_depth").value = dataArrayKaldu[id]["pikkus"]
    if(viilKatus){
        document.querySelector("ul.sisendandmed").querySelector("#cab_height_side").value = dataArrayKaldu[id]["kyljeseinaKorgus"]
        document.querySelector("ul.sisendandmed").querySelector("#cab_height_fb").value = dataArrayKaldu[id]["esiTagaKorgus"]
        document.querySelector("ul.sisendandmed").querySelector("#cab_roofHeight").value = dataArrayKaldu[id]["katusKorgus"]
    }else{
        document.querySelector("ul.sisendandmed").querySelector("#cab_height_fb").value = dataArrayKaldu[id]["esiseinaKorgus"]
        document.querySelector("ul.sisendandmed").querySelector("#cab_roofHeight").value = dataArrayKaldu[id]["tagaseinaKorgus"]
    }

    document.querySelector("ul.sisendandmed").querySelector("#palgiPaksus").value = dataArrayKaldu[id]["palgiPaksus"]
    document.querySelector("ul.sisendandmed").querySelector("#palgiKorgus").value = dataArrayKaldu[id]["palgiKorgus"]
    modal.style.display = "none";

    if(dataArrayKaldu[id]['pikemadLauad']){
        pikemadLauad = []
        pikemadLauad = JSON.parse(dataArrayKaldu[id]['pikemadLauad'])
        pikemLaudNimekiri()
        pikemLaudSum2()
    }
    if(dataArrayKaldu[id]['uksed']){
        uksed = []
        uksed = JSON.parse(dataArrayKaldu[id]['uksed'])
        usteNimekiri()
        uksedSum()
    }
    if(dataArrayKaldu[id]['aknad']){
        aknad = []
        aknad = JSON.parse(dataArrayKaldu[id]['aknad'])
        aknadNimekiri()
        aknadSum()
    }
    if(dataArrayKaldu[id]['vundament']){
        vundament = []
        vundament = JSON.parse(dataArrayKaldu[id]['vundament'])
        prussideArv = vundament[0]['arv']
        prussideVahe = vundament[0]['vahe']
        porandaSuund = vundament[0]['suund']
        prussiKaugusValisseinast12 = vundament[0]['kaugus12']
        prussiKaugusValisseinastAB = vundament[0]['kaugusab']
        vundamentNimekiri()
        vundamentKirjuta()
    }
    if(dataArrayKaldu[id]['porandalauad']){
        porand = []
        porand = JSON.parse(dataArrayKaldu[id]['porandalauad'])
        porandaLauaLaius = porand[0]['laius']
        //console.log("Porandalaudadearv", porandaLaudadeArv)
        porandNimekiri()
        porandKirjuta()
    }
    if(dataArrayKaldu[id]['parlin']){
        parlin = []
        parlin = JSON.parse(dataArrayKaldu[id]['parlin'])
        parlinKorgus = parlin[0]["korgus"];
        parlinLaius= parlin[0]["laius"];
        parlinArv = parlin[0]["arv"];
        parlinArvArvutuslik = parlin[0]['arvutuslik']
        tipuParlin = parlin[0]['tipp']
        parlinVahe = parlin[0]['vahe']
        parlinNimekiri()
        lisaParlinKirjuta()
    }
    if(dataArrayKaldu[id]['katus']){
        katus = []
        katus = JSON.parse(dataArrayKaldu[id]['katus'])
        katusArvutatud = true
        lisaKatus2()
        katusNimekiri()
        lisakatusKirjuta()
    }
    piltEsiTagu()
    piltKulje()
    sisendAndmed()
}



const nimekiriInfo = (id, kustuta) => {
    modalBody.innerHTML = id != undefined || id != null ? kustuta == undefined || kustuta == null ? "<p>Uuendame andmeid</p>" : "<p>Kustutame andmeid</p>" : "<p>Salvestame andmeid</p>"
    modalBody.classList.add("salvestame")
    setTimeout( () => {
        //console.log("aeg läbi")
        getData()
        setTimeout(()=>{
            modal.style.display = "none";
            modalBody.classList.remove("salvestame")
            avaMajadeNimekiri()},1000)
    }, 1000)
}



  document.querySelector("#hind").addEventListener("click",avaHinnad);
  document.querySelector("#detailne").addEventListener("click",detailInfo2);
  document.querySelector("#prindi").addEventListener("click",prindi);
  document.querySelector("#majadeNimekiri").addEventListener("click",avaMajadeNimekiri);
//   window.addEventListener("load", getData())



//Todo:
//! Ühekaldelisel majal:
//* 1.  Arvuta esi ja tagusein jm/m2 ühekaldelise maja puhul
//* 2.  Arvuta küljeseinte jm/m2
//* 3.  Katusetalad (pikkus vastavalt katusele või sisestatav)
//* 4.  Katuse üleülatus ühekaldelise puhul (küljed (sisestatav või vastavalt katusetalale), eest ja tagant)
//! Mitmeruumilised majad:
//! 1.  Algatuseks ühekaldelise maja puhul;
//! 2.  Siis sadulkatusega

//! Mõlemal majal:
//! 1.  neli vaadet

//!Problems:
//* Uste seeria jama (teha mingi uus lahendus selle jaoks!!!) TEHTUD!
//! akendega sama teha