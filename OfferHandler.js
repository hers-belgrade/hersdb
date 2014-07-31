var mongoose = require('mongoose'),
  RacingLogger = require('./RacingLogger'),
  executable = require('hersexecutable'),
  isExecutable = executable.isA,
  execApply = executable.apply,
  execTraverse = executable.traverse;

function handlerAdder(originalhandlers,hname){
  var h = originalhandlers[hname];
  if(isExecutable(h)){
    this[hname] = h;
  }
};

var __eventnames = [
  'onOffer','onReplyReady','onDataWritten'
];

function OfferHandler(modelname,follower,offername,handlers){
  var model = mongoose.model(modelname);
  if(!(model && model.modelName === modelname)){
    console.trace();
    console.log('no mongoose model named',modelname);
  }
  this.logger = new RacingLogger(model);
  this.handlers = {};
  if(handlers){
    execTraverse(__eventnames,[this.handlers,handlerAdder,[handlers]]);
  }
  this.offername = offername;
  this.follower = follower;
  follower.handleOffer(offername,[this,this.offerGiven]);
};
OfferHandler.prototype.offerGiven = function(offerid,data){
  if(!data){return;}
  data = JSON.parse(data);
  if(this.handlers.onOffer){
    execApply(this.handlers.onOffer,[offerid,data,[this,this.getDbId,[offerid]]]);
  }else{
    this.getDbId(offerid,data);
  }
};
OfferHandler.prototype.getDbId = function(offerid,data){
  this.logger.getId([this,this.sendDbId,[offerid,data]]);
};
OfferHandler.prototype.sendDbId = function(offerid,offerdata,dbid){
  var replyobj = {offerid:offerid};
  if(this.handlers.onReplyReady){
    execApply(this.handlers.onReplyReady,[replyobj,offerdata,dbid,[this.follower,this.follower.offer,[[this.offername],replyobj,[this,this.initialOfferResponse,[dbid,offerdata]]]]]);
  }else{
    replyobj.dbid = dbid;
    this.follower.offer([this.offername],replyobj,[this,this.initialOfferResponse,[dbid,offerdata]]);
  }
};
OfferHandler.prototype.initialOfferResponse = function(dbid,data,errc){
  if(errc==='ACCEPTED'){
    this.logger.saveId(dbid,data,this.handlers.onDataWritten);
  }else{
    this.logger.rollback(dbid);
  }
};
OfferHandler.prototype.destroy = function(){
  this.logger = null;
  this.handlers = null;
  this.offername = null;
  this.follower = null;
};


module.exports = OfferHandler;
