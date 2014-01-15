package
{
  import flash.display.Sprite;
  import flash.text.TextField;
  import flash.events.Event;
  import h264bsd.CModule;
  
  public class h264test extends Sprite
  {
    public function h264test()
    {
      addEventListener(Event.ADDED_TO_STAGE, initCode);
    }
 
    public function initCode(e:Event):void
    {
      CModule.startAsync(this)
	  
	  var ret:int = 0;
	  var tf:TextField = new TextField
      tf.multiline = true
      tf.width = stage.stageWidth
      tf.height = stage.stageHeight
      addChild(tf)
	  
	  trace("Logging Started...");
	  
	  var h264:int = 0;
	  var args:Vector.<int> = new Vector.<int>;
      h264 = CModule.callI(CModule.getPublicSymbol("h264bsdAlloc"), args);	  
	  tf.appendText("h264bsdAlloc ... " + ( h264 != 0 ? "Success" : "Failure") + "\n");
	  
	  
	  args = new <int>[h264,0];
	  ret = CModule.callI(CModule.getPublicSymbol("h264bsdInit"), args);	  	  
	  tf.appendText("h264bsdInit ... " + ( ret == 0 ? "Success" : "Failure" + ret) + "\n");  
	  
	  args = new <int>[h264];
	  CModule.callI(CModule.getPublicSymbol("h264bsdShutdown"), args);	  	  
	  tf.appendText("h264bsdShutdown ... Success\n");  
    }
  }
}
