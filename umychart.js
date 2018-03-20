/*

*/

function JSChartContainer(uielement)
{
    this.Frame;                                     //框架画法
    this.ChartPaint=new Array();                    //图形画法
    this.ExtendChartPaint=new Array();              //扩展画法
    this.TitlePaint=new Array();                    //标题画法
    this.OverlayChartPaint=new Array();             //叠加信息画法
    this.ChartCorssCursor;                          //十字光标
    this.Canvas=uielement.getContext("2d");         //画布
    this.UIElement=uielement;
    this.MouseDrag;
    this.DragMode=1;                                //拖拽模式 0 禁止拖拽 1 数据拖拽 2 区间选择

    this.CursorIndex=0;             //十字光标X轴索引
    this.LastPoint=new Point();     //鼠标位置

    //tooltip提示信息
    this.Tooltip=document.createElement("div");
    this.Tooltip.className="jschart-tooltip";
    this.Tooltip.style.background=g_JSChartResource.TooltipBGColor;
    this.Tooltip.style.opacity=g_JSChartResource.TooltipAlpha;;
    this.Tooltip.id=Guid();
    uielement.parentNode.appendChild(this.Tooltip);

    //区间选择
    this.SelectRect=document.createElement("div");
    this.SelectRect.className="jschart-selectrect";
    this.SelectRect.style.background=g_JSChartResource.SelectRectBGColor;
    this.SelectRect.style.opacity=g_JSChartResource.SelectRectAlpha;
    this.SelectRect.id=Guid();
    uielement.parentNode.appendChild(this.SelectRect);

    uielement.onmousemove=function(e)
    {
        var x = e.clientX-this.getBoundingClientRect().left;
        var y = e.clientY-this.getBoundingClientRect().top;

        if(this.JSChartContainer)
            this.JSChartContainer.OnMouseMove(x,y,e);
    }

    uielement.oncontextmenu=function(e)
    {
        var x=e.clientX-this.getBoundingClientRect().left;
        var y=e.clientY-this.getBoundingClientRect().top;

        var windowIndex=0;
        if (this.JSChartContainer)
        {   //获取数据当天在哪个子窗口上
            windowIndex=this.JSChartContainer.GetSubFrameIndex(x,y);
        }
        ContextMenu.data({
            windowIndex :windowIndex,
            x:x,
            y:y+46,
            windowWidth:this.clientWidth,
            windowHeight:this.clientHeight
        });
        ContextMenu.show();
        return false;
    }

    uielement.onmousedown=function(e)
    {
        if(!this.JSChartContainer) return;
        if(this.JSChartContainer.DragMode==0) return;

        this.JSChartContainer.HideSelectRect();

        var drag=
        {
            "Click":{},
            "LastMove":{},  //最后移动的位置
        };

        drag.Click.X=e.clientX;
        drag.Click.Y=e.clientY;
        drag.LastMove.X=e.clientX;
        drag.LastMove.Y=e.clientY;

        this.JSChartContainer.MouseDrag=drag;
        document.JSChartContainer=this.JSChartContainer;

        document.onmousemove=function(e)
        {
            if(!this.JSChartContainer) return;
            var drag=this.JSChartContainer.MouseDrag;
            if (!drag) return;

            var moveSetp=Math.abs(drag.LastMove.X-e.clientX);

            if (this.JSChartContainer.DragMode==1)  //数据左右拖拽
            {
                if (moveSetp<5) return;

                var isLeft=true;
                if (drag.LastMove.X<e.clientX) isLeft=false;//右移数据

                if(this.JSChartContainer.DataMove(moveSetp,isLeft))
                {
                    this.JSChartContainer.UpdataDataoffset();
                    this.JSChartContainer.UpdatePointByCursorIndex();
                    this.JSChartContainer.UpdateFrameMaxMin();
                    this.JSChartContainer.Draw();
                }

                drag.LastMove.X=e.clientX;
                drag.LastMove.Y=e.clientY;
            }
            else if (this.JSChartContainer.DragMode==2) //区间选择
            {
                yMoveSetp=Math.abs(drag.LastMove.Y-e.clientY);

                if (moveSetp<5 && yMoveSetp<5) return;

                this.JSChartContainer.ShowSelectRect(drag.Click.X,drag.Click.Y,e.clientX,e.clientY);

                drag.LastMove.X=e.clientX;
                drag.LastMove.Y=e.clientY;
            }
        };

        document.onmouseup=function()
        {
            //清空数据
            this.JSChartContainer.MouseDrag=null;
            this.JSChartContainer=null;

             //清空事件
            document.onmousemove=null; 
            document.onmouseup=null; 
        }
    }

    this.Draw=function()
    {
        this.Canvas.clearRect(0,0,this.UIElement.width,this.UIElement.height);

        //框架
        this.Frame.Draw();
        
        //框架内图形
        this.ChartPaint.forEach(item=>{
            item.Draw();
        });

        this.OverlayChartPaint.forEach(item=>{ 
            item.Draw();})

        //框架外图形
        this.ExtendChartPaint.forEach(item=>{
            item.Draw();
        })

        this.Frame.Snapshot();

        if (this.LastPoint.X!=null || this.LastPoint.Y!=null)
        {
            if (this.ChartCorssCursor) 
            {
                this.ChartCorssCursor.LastPoint=this.LastPoint;
                this.ChartCorssCursor.Draw();
            }
        }

        for(var i in this.TitlePaint)
        {
            var item=this.TitlePaint[i];
            if (!item.IsDynamic) continue;

            item.CursorIndex=this.CursorIndex;
            item.Draw();
        }
    }

    //画动态信息
    this.DrawDynamicInfo=function()
    {
        if (this.Frame.ScreenImageData==null) return;

        var isErase=false;
        if (this.ChartCorssCursor)
        {
            if (this.ChartCorssCursor.PointX!=null || this.ChartCorssCursor.PointY!=null)
                isErase=true;
        }

        if (isErase) this.Canvas.putImageData(this.Frame.ScreenImageData,0,0);

        if (this.ChartCorssCursor) 
        {
            this.ChartCorssCursor.LastPoint=this.LastPoint;
            this.ChartCorssCursor.Draw();
        }

        for(var i in this.TitlePaint)
        {
            var item=this.TitlePaint[i];
            if (!item.IsDynamic) continue;

            item.CursorIndex=this.CursorIndex;
            item.Draw();
        }
    }

    this.OnMouseMove=function(x,y,e)
    {
        this.LastPoint.X=x;
        this.LastPoint.Y=y;
        this.CursorIndex=this.Frame.GetXData(x);

        this.DrawDynamicInfo();

        var toolTip=new TooltipData();
        for(i in this.ChartPaint)
        {
            var item=this.ChartPaint[i];
            if (item.GetTooltipData(x,y,toolTip))
            {
                break;
            }
        }

        if (!toolTip.Data)
        {
            for(i in this.OverlayChartPaint)
            {
                var item=this.OverlayChartPaint[i];
                if (item.GetTooltipData(x,y,toolTip))
                {
                    break;
                }
            }
        }

        if (toolTip.Data)
        {
            this.ShowTooltip(x,y,toolTip);
        }
        else
        {
            this.HideTooltip();
        }
    }

    this.OnKeyDown=function(e)
    {
        var keyID = e.keyCode ? e.keyCode :e.which;
        switch(keyID)
        {
            case 37: //left
                if (this.CursorIndex<=0.99999) 
                {
                    if (!this.DataMoveLeft()) return;
                    this.UpdataDataoffset();
                    this.UpdatePointByCursorIndex();
                    this.UpdateFrameMaxMin();
                    this.Draw();
                    this.ShowTooltipByKeyDown();
                }
                else
                {
                    --this.CursorIndex;
                    this.UpdatePointByCursorIndex();
                    this.DrawDynamicInfo();
                    this.ShowTooltipByKeyDown();
                }
                break;
            case 39: //right
                var xPointcount=0;
                if (this.Frame.XPointCount) xPointcount=this.Frame.XPointCount;
                else xPointcount=this.Frame.SubFrame[0].Frame.XPointCount;
                if (this.CursorIndex+1>=xPointcount) 
                {
                    if (!this.DataMoveRight()) return;
                    this.UpdataDataoffset();
                    this.UpdatePointByCursorIndex();
                    this.UpdateFrameMaxMin();
                    this.Draw();
                    this.ShowTooltipByKeyDown();
                    return;
                }
                else
                {
                    ++this.CursorIndex;
                    this.UpdatePointByCursorIndex();
                    this.DrawDynamicInfo();
                    this.ShowTooltipByKeyDown();
                }
                break;
            case 38:    //up
                var cursorIndex={};
                cursorIndex.Index=parseInt(Math.abs(this.CursorIndex-0.5).toFixed(0));
                if (!this.Frame.ZoomUp(cursorIndex)) return;
                this.CursorIndex=cursorIndex.Index;
                this.UpdatePointByCursorIndex();
                this.UpdataDataoffset();
                this.UpdateFrameMaxMin();
                this.Draw();
                this.ShowTooltipByKeyDown();
                break;
            case 40:    //down
                var cursorIndex={};
                cursorIndex.Index=parseInt(Math.abs(this.CursorIndex-0.5).toFixed(0));
                if (!this.Frame.ZoomDown(cursorIndex)) return;
                this.CursorIndex=cursorIndex.Index;
                this.UpdataDataoffset();
                this.UpdatePointByCursorIndex();
                this.UpdateFrameMaxMin();
                this.Draw();
                this.ShowTooltipByKeyDown();
                break;
            default:
                return;
        }

        //不让滚动条滚动
        if(e.preventDefault) e.preventDefault();
        else e.returnValue = false;
    }

    this.UpdatePointByCursorIndex=function()
    {
        this.LastPoint.X=this.Frame.GetXFromIndex(this.CursorIndex);

        var index=Math.abs(this.CursorIndex-0.5);
        index=parseInt(index.toFixed(0));
        var data=this.Frame.Data;
        if (data.DataOffset+index>=data.Data.length)
        {
            return;
        }
        var close=data.Data[data.DataOffset+index].Close;

        this.LastPoint.Y=this.Frame.GetYFromData(close);
    }

    this.ShowTooltipByKeyDown=function()
    {
        var index=Math.abs(this.CursorIndex-0.5);
        index=parseInt(index.toFixed(0));
        var data=this.Frame.Data;

        var toolTip=new TooltipData();
        toolTip.Data=data.Data[data.DataOffset+index];
        toolTip.ChartPaint=this.ChartPaint[0];

        this.ShowTooltip(this.LastPoint.X,this.LastPoint.Y,toolTip);
    }

    this.ShowTooltip=function(x,y,toolTip)
    {
        var format=new HistoryDataStringFormat();
        format.Value=toolTip;
        if (!format.Operator()) return;

        var scrollPos=GetScrollPosition();
        var left = x+ this.UIElement.getBoundingClientRect().left+scrollPos.Left;
        var top = y+this.UIElement.getBoundingClientRect().top+8+scrollPos.Top;

        this.Tooltip.style.width = 100+"px";
        this.Tooltip.style.height =120+"px";
        if (toolTip.ChartPaint.Name=="Overlay-KLine")  this.Tooltip.style.height =130+"px";
        this.Tooltip.style.position = "absolute";
        this.Tooltip.style.left = left + "px";
        this.Tooltip.style.top = top + "px";
        this.Tooltip.innerHTML=format.Text;
        this.Tooltip.style.display = "block";
    }

    this.HideTooltip=function()
    {
        this.Tooltip.style.display = "none";
    }

    this.ShowSelectRect=function(x,y,x2,y2)
    {
        var left = x;
        var top = y;

        var scrollPos=GetScrollPosition();
        var borderRight=this.Frame.ChartBorder.GetRight()+this.UIElement.getBoundingClientRect().left+scrollPos.Left;
        var borderLeft=this.Frame.ChartBorder.GetLeft()+this.UIElement.getBoundingClientRect().left+scrollPos.Left;

        if (x>borderRight) x=borderRight;
        if (x2>borderRight) x2=borderRight;

        if (x<borderLeft) x=borderLeft;
        if (x2<borderLeft) x2=borderLeft;

        if (x>x2) left=x2;
        if (y>y2) top=y2;

        width=Math.abs(x-x2);
        height=Math.abs(y-y2);

        this.SelectRect.style.width = width+"px";
        this.SelectRect.style.height =height+"px";
        this.SelectRect.style.position = "absolute";
        this.SelectRect.style.left = left + "px";
        this.SelectRect.style.top = top + "px";
        this.SelectRect.style.display = "block";
    }

    this.HideSelectRect=function()
    {
        this.SelectRect.style.display = "none";
    }

    this.UpdateFrameMaxMin=function()
    {
        var frameMaxMinData=new Array();

        var chartPaint=new Array();

        for(var i in this.ChartPaint)
        {
            chartPaint.push(this.ChartPaint[i]);
        }
        for(var i in this.OverlayChartPaint)
        {
            chartPaint.push(this.OverlayChartPaint[i]);
        }

        for(var i in chartPaint)
        {
            var paint=chartPaint[i];
            var range=paint.GetMaxMin();
            if (range==null || range.Max==null || range.Min==null) continue;
            var frameItem=null;
            for(var j in frameMaxMinData)
            {
                if (frameMaxMinData[j].Frame==paint.ChartFrame) 
                {
                    frameItem=frameMaxMinData[j];
                    break;
                }
            }

            if (frameItem)
            {
                if (frameItem.Range.Max<range.Max) frameItem.Range.Max=range.Max;
                if (frameItem.Range.Min>range.Min) frameItem.Range.Min=range.Min;
            }
            else
            {
                frameItem={};
                frameItem.Frame=paint.ChartFrame;
                frameItem.Range=range;
                frameMaxMinData.push(frameItem);
            }
        }

        for(var i in frameMaxMinData)
        {
            var item=frameMaxMinData[i];
            if (!item.Frame || !item.Range) continue;
            if (item.Range.Max==null || item.Range.Min==null) continue;
            item.Frame.HorizontalMax=item.Range.Max;
            item.Frame.HorizontalMin=item.Range.Min;
            item.Frame.XYSplit=true;
        }
    }

    this.DataMoveLeft=function()
    {
        var data=null;
        if (!this.Frame.Data) data=this.Frame.Data;
        else data=this.Frame.SubFrame[0].Frame.Data;
        if (!data) return false;
        if (data.DataOffset<=0) return false;
        --data.DataOffset;
        return true;
    }

    this.DataMoveRight=function()
    {
        var data=null;
        if (!this.Frame.Data) data=this.Frame.Data;
        else data=this.Frame.SubFrame[0].Frame.Data;
        if (!data) return false;

        var xPointcount=0;
        if (this.Frame.XPointCount) xPointcount=this.Frame.XPointCount;
        else xPointcount=this.Frame.SubFrame[0].Frame.XPointCount;
        if (!xPointcount) return false;

        if (xPointcount+data.DataOffset>=data.Data.length) return false;

        ++data.DataOffset;
        return true;
    }

    this.UpdataDataoffset=function()
    {
        var data=null;
        if (this.Frame.Data) 
            data=this.Frame.Data;
        else 
            data=this.Frame.SubFrame[0].Frame.Data;

        if (!data) return;

        for(var i in this.ChartPaint)
        {
            var item =this.ChartPaint[i];
            if (!item.Data) continue;
            item.Data.DataOffset=data.DataOffset;
        }

        for(var i in this.OverlayChartPaint)
        {
            var item =this.OverlayChartPaint[i];
            if (!item.Data) continue;
            item.Data.DataOffset=data.DataOffset;
        }
    }

    this.DataMove=function(step,isLeft)
    {
        var data=null;

        if (!this.Frame.Data) data=this.Frame.Data;
        else data=this.Frame.SubFrame[0].Frame.Data;
        if (!data) return false;

        var xPointcount=0;
        if (this.Frame.XPointCount) xPointcount=this.Frame.XPointCount;
        else xPointcount=this.Frame.SubFrame[0].Frame.XPointCount;
        if (!xPointcount) return false;

        if (isLeft) //-->
        {
            if (xPointcount+data.DataOffset>=data.Data.length) return false;

            data.DataOffset+=step;

            if (data.DataOffset+xPointcount>=data.Data.length)
                data.DataOffset=data.Data.length-xPointcount;

            return true;
        }
        else        //<--
        {
            if (data.DataOffset<=0) return false;

            data.DataOffset-=step;
            if (data.DataOffset<0) data.DataOffset=0;

            return true;
        }
    }

    //获取鼠标在当前子窗口id
    this.GetSubFrameIndex=function(x,y)
    {
        if (!this.Frame.SubFrame || this.Frame.SubFrame.length<=0) return -1;

        for(var i in this.Frame.SubFrame)
        {
            var frame=this.Frame.SubFrame[i].Frame;
            var left=frame.ChartBorder.GetLeft();
            var top=frame.ChartBorder.GetTop();
            var height=frame.ChartBorder.GetHeight();
            var width=frame.ChartBorder.GetWidth();

            this.Canvas.rect(left,top,width,height);
            if (this.Canvas.isPointInPath(x,y)) return i;

        }
        return 0;
    }
}

function OnKeyDown(e) 
{ 
    if(this.JSChartContainer)
        this.JSChartContainer.OnKeyDown(e);
}

function ToFixed(number, precision) 
{
    var b = 1;
    if (isNaN(number)) return number;
    if (number < 0) b = -1;
    var multiplier = Math.pow(10, precision);
    var value=Math.round(Math.abs(number) * multiplier) / multiplier * b;

    var s = value.toString(); 
    var rs = s.indexOf('.'); 
    if (rs < 0 && precision>0) 
    { 
        rs = s.length; 
        s += '.'; 
    } 

    while (s.length <= rs + precision) 
    { 
        s += '0'; 
    } 

    return s;
}

Number.prototype.toFixed = function( precision )  
{  
    return ToFixed(this,precision)
}  

function Guid()
{  
    function S4() 
    {  
       return (((1+Math.random())*0x10000)|0).toString(16).substring(1);  
    }  
    return (S4()+S4()+"-"+S4()+"-"+S4()+"-"+S4()+"-"+S4()+S4()+S4());  
}  

function GetScrollPosition()
{
    var scrollPos={};
    var scrollTop=0; 
    var scrollLeft=0;  
    if(document.documentElement && document.documentElement.scrollTop)
    {   
        scrollTop=document.documentElement.scrollTop;   
        scrollLeft=document.documentElement.scrollLeft;
    }else if(document.body)
    {   
        scrollTop=document.body.scrollTop;   
        scrollLeft=document.body.scrollLeft;
    }  
    
    scrollPos.Top=scrollTop;
    scrollPos.Left=scrollLeft;
    return scrollPos;   
}



function Point()
{
    this.X;
    this.Y;
}

//坐标信息
function CoordinateInfo()
{
    this.Value;                                                 //坐标数据
    this.Message=new Array();                                   //坐标输出文字信息
    this.TextColor=g_JSChartResource.FrameSplitTextColor        //文字颜色
    this.Font=g_JSChartResource.FrameSplitTextFont;             //字体
    this.LineColor=g_JSChartResource.FrameSplitPen;             //线段颜色
}


//边框信息
function ChartBorder()
{
    this.UIElement; 

    //四周间距
    this.Left=50;
    this.Right=80;
    this.Top=50;
    this.Bottom=50;
    this.TitleHeight=20;    //标题高度

    this.GetChartWidth=function()
    {
        return this.UIElement.width;
    }

    this.GetChartHeight=function()
    {
        return this.UIElement.height;
    }

    this.GetLeft=function()
    {
        return this.Left;
    }

    this.GetRight=function()
    {
        return this.UIElement.width-this.Right;
    }

    this.GetTop=function()
    {
        return this.Top;
    }

    this.GetTopEx=function()    //去掉标题
    {
        return this.Top+this.TitleHeight;
    }

    this.GetBottom=function()
    {
        return this.UIElement.height-this.Bottom;
    }

    this.GetWidth=function()
    {
        return this.UIElement.width-this.Left-this.Right;
    }

    this.GetHeight=function()
    {
        return this.UIElement.height-this.Top-this.Bottom;
    }

    this.GetHeightEx=function() //去掉标题的高度
    {
        return this.UIElement.height-this.Top-this.Bottom-this.TitleHeight;
    }

    this.GetTitleHeight=function()
    {
        return this.TitleHeight;
    }
}

function IChartFramePainting()
{
    this.HorizontalInfo=new Array();    //Y轴
    this.VerticalInfo=new Array();      //X轴

    this.Canvas;                        //画布
    this.ChartBorder;
    this.PenBorder=g_JSChartResource.FrameBorderPen;    //边框颜色
    this.IsShow=true;                   //是否显示
    this.SizeChange=true;               //大小是否改变
    this.XYSplit=true;            //XY轴坐标信息改变

    this.HorizontalMax;                 //Y轴最大值
    this.HorizontalMin;                 //Y轴最小值
    this.XPointCount=10;                //X轴数据个数

    this.YSplitOperator;               //Y轴分割
    this.XSplitOperator;               //X轴分割
    this.Data;                         //主数据

    this.Draw=function()                
    {
        this.DrawFrame();
        this.DrawBorder();

        this.SizeChange=false;
        this.XYSplit=false;
    }

    this.DrawFrame=function() { }

    //画边框
    this.DrawBorder=function()  
    {
        var left=this.ChartBorder.GetLeft();
        var top=this.ChartBorder.GetTop();
        var width=this.ChartBorder.GetWidth();
        var height=this.ChartBorder.GetHeight();

        this.Canvas.strokeStyle=this.PenBorder;
        this.Canvas.strokeRect(left,top,width,height);
    }
}

function AverageWidthFrame()
{
    this.newMethod=IChartFramePainting;   //派生
    this.newMethod();
    delete this.newMethod;

    this.DataWidth=50;
    this.DistanceWidth=10;

    this.DrawFrame=function()
    {
        if (this.XPointCount>0)
        {
            this.DistanceWidth=this.ChartBorder.GetWidth()/(4*this.XPointCount);
			this.DataWidth=2*this.DistanceWidth;
        }

        this.DrawHorizontal();
        this.DrawVertical();
    }

    this.GetYFromData=function(value)
    {
        if(value<=this.HorizontalMin) return this.ChartBorder.GetBottom();
        if(value>=this.HorizontalMax) return this.ChartBorder.GetTopEx();

        var height=this.ChartBorder.GetHeightEx()*(value-this.HorizontalMin)/(this.HorizontalMax-this.HorizontalMin);
        return this.ChartBorder.GetBottom()-height;
    }

    //画Y轴
    this.DrawHorizontal=function()
    {
        var left=this.ChartBorder.GetLeft();
        var right=this.ChartBorder.GetRight();

        var yPrev=null; //上一个坐标y的值
        for(var i=this.HorizontalInfo.length-1; i>=0; --i)  //从上往下画分割线
        {
            var item=this.HorizontalInfo[i];
            var y=this.GetYFromData(item.Value);
            if (y!=null && Math.abs(y-yPrev)<15) continue;  //两个坐标在近了 就不画了

            this.Canvas.strokeStyle=item.LineColor; 
            this.Canvas.beginPath(); 
            this.Canvas.moveTo(left,y);
            this.Canvas.lineTo(right,y);
            this.Canvas.stroke();
            
            //坐标信息 左边
            if (item.Message[0]!=null)
            {
                if (item.Font!=null) this.Canvas.font=item.Font;

                this.Canvas.fillStyle=item.TextColor;
                this.Canvas.textAlign="right";
                this.Canvas.textBaseline="middle";
                this.Canvas.fillText(item.Message[0],left-2,y);
            }

            //坐标信息 右边
            if (item.Message[1]!=null)
            {
                if (item.Font!=null) this.Canvas.font=item.Font;

                this.Canvas.fillStyle=item.TextColor;
                this.Canvas.textAlign="left";
                this.Canvas.textBaseline="middle";
                this.Canvas.fillText(item.Message[1],right+2,y);
            }

            yPrev=y;
        }
    }

    this.GetXFromIndex=function(index)
    {
        var count=this.XPointCount;

        if (count==1)
        {
            if (index==0) return this.ChartBorder.GetLeft();
            else return this.ChartBorder.GetRight();
        }
        else if (count<=0)
        {
            return this.ChartBorder.GetLeft();
        }
        else if (index>=count)
        {
            return this.ChartBorder.GetRight();
        }
        else
        {
            var offset=this.ChartBorder.GetLeft()+this.ChartBorder.GetWidth()*index/count;
            return offset;
        }
    }

    //画X轴
    this.DrawVertical=function()
    {
        var top=this.ChartBorder.GetTopEx();
        var bottom=this.ChartBorder.GetBottom();
        var right=this.ChartBorder.GetRight();

        var xPrev=null; //上一个坐标x的值
        for(var i in this.VerticalInfo)
        {
            var x=this.GetXFromIndex(this.VerticalInfo[i].Value);
            if (x>=right) break;
            if (xPrev!=null && Math.abs(x-xPrev)<80) continue;
            
            this.Canvas.strokeStyle=this.VerticalInfo[i].LineColor;  
            this.Canvas.beginPath(); 
            this.Canvas.moveTo(x,top);
            this.Canvas.lineTo(x,bottom);
            this.Canvas.stroke();

            if (this.VerticalInfo[i].Message[0]!=null)
            {
                if (this.VerticalInfo[i].Font!=null)
                    this.Canvas.font=this.VerticalInfo[i].Font;

                this.Canvas.fillStyle=this.VerticalInfo[i].TextColor;
                var testWidth=this.Canvas.measureText(this.VerticalInfo[i].Message[0]).width;
                if (x<testWidth/2)
                {
                    this.Canvas.textAlign="left";
                    this.Canvas.textBaseline="top";
                }
                else
                {
                    this.Canvas.textAlign="center";
                    this.Canvas.textBaseline="top";
                }
                this.Canvas.fillText(this.VerticalInfo[i].Message[0],x,bottom);
            }

            xPrev=x;
        }
    }

    //Y坐标转y轴数值
    this.GetYData=function(y)
    {
        if (y<this.ChartBorder.GetTopEx()) return this.HorizontalMax;
		if (y>this.ChartBorder.GetBottom()) return this.HorizontalMin;

		return (this.ChartBorder.GetBottom()-y)/this.ChartBorder.GetHeightEx()*(this.HorizontalMax-this.HorizontalMin)+this.HorizontalMin;	
    }

    //X坐标转x轴数值
    this.GetXData=function(x)
    {
        if (x<=this.ChartBorder.GetLeft()) return 0;
		if (x>=this.ChartBorder.GetRight()) return this.XPointCount;

		return (x-this.ChartBorder.GetLeft())*(this.XPointCount*1.0/this.ChartBorder.GetWidth());
    }
}

function MinuteFrame()
{
    this.newMethod=AverageWidthFrame;   //派生
    this.newMethod();
    delete this.newMethod;

    this.DrawFrame=function()
    {
        this.SplitXYCoordinate();

        this.DrawHorizontal();
        this.DrawVertical();
    }

    //分割x,y轴坐标信息
    this.SplitXYCoordinate=function()
    {
        if (this.XYSplit==false) return;
        if (this.YSplitOperator!=null) this.YSplitOperator.Operator();
        if (this.XSplitOperator!=null) this.XSplitOperator.Operator();
    }

    this.GetXFromIndex=function(index)
    {
        var count=this.XPointCount-1;

        if (count==1)
        {
            if (index==0) return this.ChartBorder.GetLeft();
            else return this.ChartBorder.GetRight();
        }
        else if (count<=0)
        {
            return this.ChartBorder.GetLeft();
        }
        else if (index>=count)
        {
            return this.ChartBorder.GetRight();
        }
        else
        {
            var offset=this.ChartBorder.GetLeft()+this.ChartBorder.GetWidth()*index/count;
            return offset;
        }
    }
}

//K线框架
function KLineFrame()
{
    this.newMethod=AverageWidthFrame;   //派生
    this.newMethod();
    delete this.newMethod;

    this.DrawFrame=function()
    {
        this.SplitXYCoordinate();

        if (this.SizeChange==true) this.CalculateDataWidth();

        this.DrawHorizontal();
        this.DrawVertical();
    }

    this.GetXFromIndex=function(index)
    {
        if (index < 0) index = 0;
	    if (index > this.xPointCount - 1) index = this.xPointCount - 1;

        var offset=this.ChartBorder.GetLeft()+2+this.DistanceWidth/2+this.DataWidth/2;
        for(var i=1;i<=index;++i)
        {
            offset+=this.DistanceWidth+this.DataWidth;
        }

        return offset;
    }

    //计算数据宽度
    this.CalculateDataWidth=function()
    {
        if (this.XPointCount<2) return;

        var width=this.ChartBorder.GetWidth();

        for(var i=0;i<ZOOM_SEED.length;++i)
        {
            if((ZOOM_SEED[i][0] + ZOOM_SEED[i][1]) * this.XPointCount < width)
            {
                this.ZoomIndex=i;
                this.DataWidth = ZOOM_SEED[i][0];
                this.DistanceWidth = ZOOM_SEED[i][1];
                if (i == 0) break;      // 如果是最大的缩放因子，不再调整数据宽度
                
                this.TrimKLineDataWidth(width);
                return;
            }
        }
    }

    this.TrimKLineDataWidth=function(width)
    {
        while(true)
        {
            if((this.DistanceWidth + this.DataWidth) * this.XPointCount + this.DistanceWidth > width)
            {
                this.DataWidth -= 0.01;
                break;
            }
            this.DataWidth += 0.01;
        }
    }

    //分割x,y轴坐标信息
    this.SplitXYCoordinate=function()
    {
        if (this.XYSplit==false) return;
        if (this.YSplitOperator!=null) this.YSplitOperator.Operator();
        if (this.XSplitOperator!=null) this.XSplitOperator.Operator();
    }

    this.CalculateCount=function(zoomIndex)
    {
        var width=this.ChartBorder.GetWidth();

        return parseInt(width/(ZOOM_SEED[zoomIndex][0] + ZOOM_SEED[zoomIndex][1]));
    }

    this.ZoomUp=function(cursorIndex)
    {
        if (this.ZoomIndex<=0) return false;
        if (this.Data.DataOffset<0) return false;

        var lastDataIndex = this.Data.DataOffset + this.XPointCount - 1;    //最右边的数据索引
        var lastCursorIndex=this.Data.DataOffset + cursorIndex.Index;

        --this.ZoomIndex;
        var xPointCount=this.CalculateCount(this.ZoomIndex);

        this.XPointCount=xPointCount;

        this.DataWidth = ZOOM_SEED[this.ZoomIndex][0];
	    this.DistanceWidth = ZOOM_SEED[this.ZoomIndex][1];

        this.TrimKLineDataWidth(this.ChartBorder.GetWidth());

        if (lastDataIndex>=this.Data.Data.length)
        {
            this.Data.DataOffset=this.Data.Data.length-this.XPointCount-2;
            cursorIndex.Index=this.Data.Data.length-this.Data.DataOffset-1;
        }
        else
        {
            this.Data.DataOffset = lastDataIndex - this.XPointCount+1;
            cursorIndex.Index=lastCursorIndex-this.Data.DataOffset;
        }

        return true;
    }

    this.ZoomDown=function(cursorIndex)
    {
        if (this.ZoomIndex+1>=ZOOM_SEED.length) return false;
        if (this.Data.DataOffset<0) return false;

        var lastDataIndex = this.Data.DataOffset + this.XPointCount - 1;    //最右边的数据索引
        if (lastDataIndex>=this.Data.Data.length) lastDataIndex=this.Data.Data.length-1;
        var xPointCount=this.CalculateCount(this.ZoomIndex+1);

        var lastCursorIndex=this.Data.DataOffset + cursorIndex.Index;

        ++this.ZoomIndex;
        this.XPointCount=xPointCount;
        this.DataWidth = ZOOM_SEED[this.ZoomIndex][0];
	    this.DistanceWidth = ZOOM_SEED[this.ZoomIndex][1];

        this.TrimKLineDataWidth(this.ChartBorder.GetWidth());

        if (lastDataIndex-xPointCount+1<0)
            this.Data.DataOffset=0;
        else 
            this.Data.DataOffset = lastDataIndex - this.XPointCount+1;

        cursorIndex.Index=lastCursorIndex-this.Data.DataOffset;
    
        return true;
    }
}

function SubFrameItem()
{
    this.Frame;
    this.Height;
}

//行情框架
function HQTradeFrame()
{
    this.SubFrame=new Array();              //SubFrameItem 数组            
    this.SizeChange=true;                   //大小是否改变
    this.ChartBorder;
    this.Canvas;                            //画布
    this.ScreenImageData;                   //截图
    this.Data;                              //主数据

    this.CalculateChartBorder=function()    //计算每个子框架的边框信息
    {
        if (this.SubFrame.length<=0) return;

        var top=this.ChartBorder.GetTop();
        var height=this.ChartBorder.GetHeight();
        var totalHeight=0;
        
        this.SubFrame.forEach(item => {
            totalHeight+=item.Height;
        });

        this.SubFrame.forEach(item=>{
            item.Frame.ChartBorder.Top=top;
            item.Frame.ChartBorder.Left=this.ChartBorder.Left;
            item.Frame.ChartBorder.Right=this.ChartBorder.Right;
            var frameHeight=height*(item.Height/totalHeight)+top;
            item.Frame.ChartBorder.Bottom=this.ChartBorder.GetChartHeight()-frameHeight;
            top=frameHeight;
        });
    }

    this.Draw=function()
    {
        if (this.SizeChange==true) this.CalculateChartBorder();

        this.SubFrame.forEach(item =>{
            item.Frame.Draw();
        });

        SizeChange=false;
    }

    this.SetSizeChage=function(sizeChange)
    {
        this.SizeChange=sizeChange;
        this.SubFrame.forEach(item=>{
            item.Frame.SizeChange=sizeChange;
        })
    }

    //图形快照
    this.Snapshot=function()
    {
        this.ScreenImageData=this.Canvas.getImageData(0,0,this.ChartBorder.GetChartWidth(),this.ChartBorder.GetChartHeight());
    }

    this.GetXData=function(x)
    {
        return this.SubFrame[0].Frame.GetXData(x);
    }

    this.GetYData=function(y)
    {
        var frame;
        for(i in this.SubFrame)
        {
            var item=this.SubFrame[i];
            var left=item.Frame.ChartBorder.GetLeft();
            var top=item.Frame.ChartBorder.GetTopEx();
            var width=item.Frame.ChartBorder.GetWidth();
            var height=item.Frame.ChartBorder.GetHeightEx();

            item.Frame.Canvas.beginPath();
            item.Frame.Canvas.rect(left,top,width,height);
            if (item.Frame.Canvas.isPointInPath(left,y))
            {
                frame=item.Frame;
                break;
            }
        }

        if (frame!=null) return frame.GetYData(y);
    }

    this.GetXFromIndex=function(index)
    {
        return this.SubFrame[0].Frame.GetXFromIndex(index);
    }

    this.GetYFromData=function(value)
    {
        return this.SubFrame[0].Frame.GetYFromData(value);
    }

    this.ZoomUp=function(cursorIndex)
    {
        var result=this.SubFrame[0].Frame.ZoomUp(cursorIndex);
        for(var i=1;i<this.SubFrame.length;++i)
        {
            this.SubFrame[i].Frame.XPointCount= this.SubFrame[0].Frame.XPointCount;
            this.SubFrame[i].Frame.ZoomIndex= this.SubFrame[0].Frame.ZoomIndex;
            this.SubFrame[i].Frame.DataWidth= this.SubFrame[0].Frame.DataWidth;
            this.SubFrame[i].Frame.DistanceWidth= this.SubFrame[0].Frame.DistanceWidth;
        }

        return result;
    }

    this.ZoomDown=function(cursorIndex)
    {
        var result=this.SubFrame[0].Frame.ZoomDown(cursorIndex);
        for(var i=1;i<this.SubFrame.length;++i)
        {
            this.SubFrame[i].Frame.XPointCount= this.SubFrame[0].Frame.XPointCount;
            this.SubFrame[i].Frame.ZoomIndex= this.SubFrame[0].Frame.ZoomIndex;
            this.SubFrame[i].Frame.DataWidth= this.SubFrame[0].Frame.DataWidth;
            this.SubFrame[i].Frame.DistanceWidth= this.SubFrame[0].Frame.DistanceWidth;
        }

        return result;
    }
}

//历史K线数据
function HistoryData()
{
    this.Date;
    this.YClose;
    this.Open;
    this.Close;
    this.High;
    this.Low;
    this.Vol;
    this.Amount;
}

//数据复制
HistoryData.Copy=function(data)
{
    var newData=new HistoryData();
    newData.Date=data.Date;
    newData.YClose=data.YClose;
    newData.Open=data.Open;
    newData.Close=data.Close;
    newData.High=data.High;
    newData.Low=data.Low;
    newData.Vol=data.Vol;
    newData.Amount=data.Amount;

    return newData;
}

//数据复权拷贝
HistoryData.CopyRight=function(data,seed)
{
    var newData=new HistoryData();
    newData.Date=data.Date;
    newData.YClose=data.YClose*seed;
    newData.Open=data.Open*seed;
    newData.Close=data.Close*seed;
    newData.High=data.High*seed;
    newData.Low=data.Low*seed;

    newData.Vol=data.Vol;
    newData.Amount=data.Amount;

    return newData;
}

function MinuteData()
{
    this.Price;
    this.Open;
    this.High;
    this.Low;
    this.Vol;
    this.Amount;
    this.DateTime;
    this.Increate;
    this.Risefall;
    this.AvPrice;
}

function ChartData()
{
    this.Data=new Array();
    this.DataOffset=0;                        //数据偏移
    this.Period=0;                            //周期 0 日线 1 周线 2 月线 3年线
    this.Right=0;                             //复权 0 不复权 1 前复权 2 后复权

    this.GetCloseMA=function(dayCount) 
    {
        var result=new Array();
        for (var i = 0, len = this.Data.length; i < len; i++) 
        {
            if (i < dayCount) 
            {
                result[i]=null;
                continue;
            }

            var sum = 0;
            for (var j = 0; j < dayCount; j++) 
            {
                sum += this.Data[i - j].Close;
            }
            result[i]=sum / dayCount;
        }
        return result;
    }

    this.GetVolMA=function(dayCount)
    {
    var result=new Array();
    for (var i = 0, len = this.Data.length; i < len; i++) 
    {
        if (i < dayCount) 
        {
            result[i]=null;
            continue;
        }

        var sum = 0;
        for (var j = 0; j < dayCount; j++) 
        {
            sum += this.Data[i - j].Vol;
        }
        result[i]=sum / dayCount;
    }
    return result;
    }

    this.GetAmountMA=function(dayCount)
    {
    var result=new Array();
    for (var i = 0, len = this.Data.length; i < len; i++) 
    {
        if (i < dayCount) 
        {
            result[i]=null;
            continue;
        }

        var sum = 0;
        for (var j = 0; j < dayCount; j++) 
        {
            sum += this.Data[i - j].Amount;
        }
        result[i]=sum / dayCount;
    }
    return result;
    }

    //获取收盘价
    this.GetClose=function()
    {
        var result=new Array();
        for(var i in this.Data)
        {
            result[i]=this.Data[i].Close;
        }

        return result;
    }

    this.GetYClose=function()
    {
        var result=new Array();
        for(var i in this.Data)
        {
            result[i]=this.Data[i].YClose;
        }

        return result;
    }

    this.GetHigh=function()
    {
        var result=new Array();
        for(var i in this.Data)
        {
            result[i]=this.Data[i].High;
        }

        return result;
    }

    this.GetLow=function()
    {
        var result=new Array();
        for(var i in this.Data)
        {
            result[i]=this.Data[i].Low;
        }

        return result;
    }

    this.GetOpen=function()
    {
        var result=new Array();
        for(var i in this.Data)
        {
            result[i]=this.Data[i].Open;
        }

        return result;
    }

    this.GetVol=function()
    {
        var result=new Array();
        for(var i in this.Data)
        {
            result[i]=this.Data[i].Vol;
        }

        return result;
    }

    //周期数据 1=周 2=月 3=年
    this.GetPeriodData=function(period)
    {
        var result=new Array();
        var index=0;
        var startDate=0;
        var newData=null;
        for(var i in this.Data)
        {
            var isNewData=false;
            var dayData=this.Data[i];
            
            switch(period)
            {
                case 1: //周线
                    var fridayDate=ChartData.GetFirday(dayData.Date);
                    if (fridayDate!=startDate)
                    {
                        isNewData=true;
                        startDate=fridayDate;
                    }
                    break;
                case 2: //月线
                    if (parseInt(dayData.Date/100)!=parseInt(startDate/100))
                    {
                        isNewData=true;
                        startDate=dayData.Date;
                    }
                    break;
                case 3: //年线
                    if (parseInt(dayData.Date/10000)!=parseInt(startDate/10000))
                    {
                        isNewData=true;
                        startDate=dayData.Date;
                    }
                    break;
            }

            if (isNewData) 
            {
                newData=new HistoryData();
                newData.Date=dayData.Date;
                result.push(newData);

                if (dayData.Open==null || dayData.Close==null) continue;

                newData.Open=dayData.Open;
                newData.High=dayData.High;
                newData.Low=dayData.Low;
                newData.YClose=dayData.YClose;
                newData.Close=dayData.Close;
                newData.Vol=dayData.Vol;
                newData.Amount=dayData.Amount;
            }
            else
            {
                if (newData==null) continue;
                if (dayData.Open==null || dayData.Close==null) continue;

                if (newData.Open==null || newData.Close==null)
                {
                    newData.Open=dayData.Open;
                    newData.High=dayData.High;
                    newData.Low=dayData.Low;
                    newData.YClose=dayData.YClose;
                    newData.Close=dayData.Close;
                    newData.Vol=dayData.Vol;
                    newData.Amount=dayData.Amount;
                }
                else
                {
                    if (newData.High<dayData.High) newData.High=dayData.High;
                    if (newData.Low>dayData.Low) newData.Low=dayData.Low;

                    newData.Close=dayData.Close;
                    newData.Vol+=dayData.Vol;
                    newData.Amount+=dayData.Amount;
                    newData.Date=dayData.Date;
                }
            }
        }

        return result;
    }

    //复权  0 不复权 1 前复权 2 后复权
    this.GetRightDate=function(right)
    {
        var result=[];
        if (this.Data.length<=0) return result;

        if (right==1)
        {
            var index=this.Data.length-1;
            var seed=1; //复权系数
            var yClose=this.Data[index].YClose;

            result[index]=HistoryData.Copy(this.Data[index]);

            for(--index; index>=0; --index)
            {
                if (yClose!=this.Data[index].Close) break;
                result[index]=HistoryData.Copy(this.Data[index]);
                yClose=this.Data[index].YClose;
            }

            for(; index>=0; --index)
            {
                if(yClose!=this.Data[index].Close)
                    seed *= yClose/this.Data[index].Close;
                
                result[index]=HistoryData.CopyRight(this.Data[index],seed);

                yClose=this.Data[index].YClose;
            }
        }
        else if (right==2)
        {
            var index=0;
            var seed=1;
            var close=this.Data[index].Close;
            result[index]=HistoryData.Copy(this.Data[index]);

            for(++index;index<this.Data.length;++index)
            {
                if (close!=this.Data[index].YClose) break;
                result[index]=HistoryData.Copy(this.Data[index]);
                close=this.Data[index].Close;
            }

            for(;index<this.Data.length;++index)
            {
                if(close!=this.Data[index].YClose)
                    seed *= close/this.Data[index].YClose;
                
                result[index]=HistoryData.CopyRight(this.Data[index],seed);

                close=this.Data[index].Close;
            }
        }

        return result;
    }

    //叠加数据和主数据拟合,去掉主数据没有日期的数据
    this.GetOverlayData=function(overlayData)
    {
        var result=[];

        for(var i=0,j=0;i<this.Data.length;)
        {
            var date=this.Data[i].Date;

            if (j>=overlayData.length)
            {
                result[i]=new HistoryData();
                result[i].Date=date;
                ++i;
                continue;;
            }

            var overlayDate=overlayData[j].Date;

            if (overlayDate==date)
            {
                result[i]=new HistoryData();
                result[i].Date=overlayData[j].Date;
                result[i].YClose=overlayData[j].YClose;
                result[i].Open=overlayData[j].Open;
                result[i].High=overlayData[j].High;
                result[i].Low=overlayData[j].Low;
                result[i].Close=overlayData[j].Close;
                result[i].Vol=overlayData[j].Vol;
                result[i].Amount=overlayData[j].Amount;
                ++j;
                ++i;
            }
            else if (overlayDate<date)
            {
                ++j;
            }
            else 
            {
                result[i]=new HistoryData();
                result[i].Date=date;
                ++i;
            }
        }

        return result;
    }

    //////////////////////////////////////////////////////////
    //分钟数据方法
    /////////////////////////////////////////////////////////
    
    //分钟价格数据
    this.GetMinutePrice=function()
    {
        var result=new Array();
        for(var i in this.Data)
        {
            result[i]=this.Data[i].Price;
        }

        return result;
    }

    //分钟均线
    this.GetMinuteAvPrice=function()
    {
        var result=new Array();
        for(var i in this.Data)
        {
            result[i]=this.Data[i].AvPrice;
        }

        return result;
    }

    this.GetMinuteVol=function()
    {
        var result=new Array();
        for(var i in this.Data)
        {
            result[i]=this.Data[i].Vol;
        }

        return result;
    }
}

ChartData.GetFirday=function(value)
{
    var date=new Date(parseInt(value/10000),(value/100%100-1),value%100);
    var day=date.getDay();
    if (day==5) return value;

    var timestamp=date.getTime();
    if (day<5)
    {
        var prevTimestamp=(24*60*60*1000)*(5-day);
        timestamp+=prevTimestamp;
    }
    else 
    {
        var prevTimestamp=(24*60*60*1000)*(day-5);
        timestamp-=prevTimestamp;
    }

    date.setTime(timestamp);
    var fridayDate= date.getFullYear()*10000+(date.getMonth()+1)*100+date.getDate();
    var week=date.getDay();
    return fridayDate;

}

function TooltipData()              //提示信息
{
    this.ChartPaint;
    this.Data;
}

function Rect(x,y,width,height)
{
    this.X=x,
    this.Y=y;
    this.Width=width;
    this.Height=height;
}

//图新画法接口类
function IChartPainting()
{
    this.Canvas;                        //画布
    this.ChartBorder;                   //边框信息
    this.ChartFrame;                    //框架画法
    this.Name;                          //名称
    this.Data=new ChartData();          //数据区

    this.Draw=function()
    {

    }

    this.GetTooltipData=function(x,y,tooltip)
    {
        return false;
    }

    this.GetMaxMin=function()
    {
        var xPointCount=this.ChartFrame.XPointCount;
        var range={};
        range.Min=null;
        range.Max=null;
        for(var i=this.Data.DataOffset,j=0;i<this.Data.Data.length && j<xPointCount;++i,++j)
        {
            var value=this.Data.Data[i];
            if (range.Max==null) range.Max=value;
            if (range.Min==null) range.Min=value;

            if (range.Max<value) range.Max=value;
            if (range.Min>value) range.Min=value;
        }

        return range;
    }
}


//缩放因子
var ZOOM_SEED=
[
    [49,10],	[46,9],		[43,8],
    [41,7.5],	[39,7],		[37,6],
    [31,5.5],	[27,5],		[23,4.5],
    [21,4],		[18,3.5],	[16,3],
    [13,2.5],	[11,2],		[8,1.5],
    [6,1],		[3,0.6],	[2.2,0.5],
    //太多了卡,
    //[1.1,0.3],	
    //[0.9,0.2],	[0.7,0.15],
    //[0.6,0.12],	[0.5,0.1],	[0.4,0.08],
    //[0.3,0.06],	[0.2,0.04],	[0.1,0.02]
];

//K线画法
function ChartKLine()
{
    this.newMethod=IChartPainting;   //派生
    this.newMethod();
    delete this.newMethod;

    this.UpColor=g_JSChartResource.UpBarColor;
    this.DownColor=g_JSChartResource.DownBarColor;                    
    this.UnchagneColor=g_JSChartResource.UnchagneBarColor;          //平盘
    this.ZoomIndex=0;                       //缩放因子
    this.TooltipRect=new Array();           //2位数组 0 数据序号 1 区域

    this.Draw=function()
    {
        var dataWidth=this.ChartFrame.DataWidth;
        var distanceWidth=this.ChartFrame.DistanceWidth;
        var xOffset=this.ChartBorder.GetLeft()+distanceWidth/2.0+2.0;
        var chartright=this.ChartBorder.GetRight();
        var xPointCount=this.ChartFrame.XPointCount;

        this.TooltipRect=[];
        for(var i=this.Data.DataOffset,j=0;i<this.Data.Data.length && j<xPointCount;++i,++j,xOffset+=(dataWidth+distanceWidth))
        {
            var data=this.Data.Data[i];
            if (data.Open==null || data.High==null || data.Low==null || data.Close==null) continue;
            
            var left=xOffset;
            var right=xOffset+dataWidth;
            if (right>chartright) break;
            var x=left+(right-left)/2;
            var yLow=this.ChartFrame.GetYFromData(data.Low);
            var yHigh=this.ChartFrame.GetYFromData(data.High);
            var yOpen=this.ChartFrame.GetYFromData(data.Open);
            var yClose=this.ChartFrame.GetYFromData(data.Close);
            var y=yHigh;

            if (data.Open<data.Close)       //阳线
            {
                this.Canvas.strokeStyle=this.UpColor;  
                var bDrawLine=false;
                if (data.High>data.Close)   //上影线
                {
                    this.Canvas.beginPath();
                    this.Canvas.moveTo(x,y);
                    this.Canvas.lineTo(x,yClose);
                    this.Canvas.stroke();
                    y=yClose;
                }
                else
                {
                    y=yClose;
                }

                this.Canvas.fillStyle=this.UpColor;
                this.Canvas.fillRect(left,y,dataWidth,yOpen-y);

                if (data.Open>data.Low)
                {
                    this.Canvas.beginPath();
                    this.Canvas.moveTo(x,y);
                    this.Canvas.lineTo(x,yLow);
                    this.Canvas.stroke();
                }
            }
            else if (data.Open>data.Close)  //阴线
            {
                this.Canvas.strokeStyle=this.DownColor;  
                if (data.High>data.Close)   //上影线
                {
                    this.Canvas.beginPath();
                    this.Canvas.moveTo(x,y);
                    this.Canvas.lineTo(x,yOpen);
                    this.Canvas.stroke();
                    y=yOpen;
                }
                else
                {
                    y=yOpen
                }

                this.Canvas.fillStyle=this.DownColor;
                this.Canvas.fillRect(left,y,dataWidth,yClose-y);

                if (data.Open>data.Low) //下影线
                {
                    this.Canvas.beginPath();
                    this.Canvas.moveTo(x,y);
                    this.Canvas.lineTo(x,yLow);
                    this.Canvas.stroke();
                }
            }
            else // 平线
            {
                this.Canvas.strokeStyle=this.UnchagneColor;
                this.Canvas.beginPath();
                if (data.High>data.Close)   //上影线
                {
                   
                    this.Canvas.moveTo(x,y);
                    this.Canvas.lineTo(x,yOpen);
                   
                    y=yOpen;
                }
                else
                {
                    y=yOpen;
                }

                this.Canvas.moveTo(left,y);
                this.Canvas.lineTo(right,y);

                if (data.Open>data.Low) //下影线
                {
                    this.Canvas.moveTo(x,y);
                    this.Canvas.lineTo(x,yLow);
                }

                this.Canvas.stroke();
            }
            
            //添加tooltip区域
            {
                var yTop=Math.min(yLow,yHigh,yOpen,yClose);
                var yBottom=Math.max(yLow,yHigh,yOpen,yClose);
                var rect=new Rect(left,yTop,dataWidth,yBottom-yTop);
                //this.Canvas.fillStyle="rgb(0,0,100)";
                //this.Canvas.fillRect(rect.X,rect.Y,rect.Width,rect.Height);
                this.TooltipRect.push([i,rect]);    //[0]数据索引 [1]数据区域
             }
        }
    }

    this.GetTooltipData=function(x,y,tooltip)
    {
        for(var i in this.TooltipRect)
        {
            var rect=this.TooltipRect[i][1];
            this.Canvas.beginPath();
            this.Canvas.rect(rect.X,rect.Y,rect.Width,rect.Height);
            if (this.Canvas.isPointInPath(x,y))
            {
                var index=this.TooltipRect[i][0];
                tooltip.Data=this.Data.Data[index];
                tooltip.ChartPaint=this;
                return true;
            }
        }
        return false;
    }

    //计算当天显示数据的最大最小值
    this.GetMaxMin=function()
    {
        var xPointCount=this.ChartFrame.XPointCount;
        var range={};
        range.Max=null;
        range.Min=null;
        for(var i=this.Data.DataOffset,j=0;i<this.Data.Data.length && j<xPointCount;++i,++j)
        {
            var data=this.Data.Data[i];
            if (data.Open==null || data.High==null || data.Low==null || data.Close==null) continue;

            if (range.Max==null) range.Max=data.High;
            if (range.Min==null) range.Min=data.Low;

            if (range.Max<data.High) range.Max=data.High;
            if (range.Min>data.Low) range.Min=data.Low;
        }

        return range;
    }
}

//K线叠加
function ChartOverlayKLine()
{
    this.newMethod=IChartPainting;   //派生
    this.newMethod();
    delete this.newMethod;

    this.Color="rgb(65,105,225)";
    this.MainData;                  //主图K线数据
    this.SourceData;                //叠加的原始数据
    this.Name="ChartOverlayKLine";
    this.Title;

    this.Draw=function()
    {
        if (!this.MainData || !this.Data) return;

        var dataWidth=this.ChartFrame.DataWidth;
        var distanceWidth=this.ChartFrame.DistanceWidth;
        var xOffset=this.ChartBorder.GetLeft()+distanceWidth/2.0+2.0;
        var chartright=this.ChartBorder.GetRight();
        var xPointCount=this.ChartFrame.XPointCount;

        this.TooltipRect=[];
        var isFristDraw=true;

        var firstOpen=null; //主线数据第1个收盘价
        for(var i=this.Data.DataOffset,j=0;i<this.MainData.Data.length && j<xPointCount;++i,++j)
        {
            var data=this.MainData.Data[i];
            if (data.Open==null || data.High==null || data.Low==null || data.Close==null) continue;
            firstOpen=data.Close;
            break;
        }

        if (firstOpen==null) return;

        var firstOverlayOpen=null;

        for(var i=this.Data.DataOffset,j=0;i<this.Data.Data.length && j<xPointCount;++i,++j,xOffset+=(dataWidth+distanceWidth))
        {
            var data=this.Data.Data[i];
            if (!data || data.Open==null || data.High==null || data.Low==null || data.Close==null) continue;

            if (firstOverlayOpen==null) firstOverlayOpen=data.Open;
            
            if (isFristDraw)
            {
                this.Canvas.strokeStyle=this.Color;  
                this.Canvas.fillStyle=this.Color;
                this.Canvas.beginPath();
                isFristDraw=false;
            }

            var left=xOffset;
            var right=xOffset+dataWidth;
            if (right>chartright) break;
            var x=left+(right-left)/2;
            var yLow=this.ChartFrame.GetYFromData(data.Low/firstOverlayOpen*firstOpen);
            var yHigh=this.ChartFrame.GetYFromData(data.High/firstOverlayOpen*firstOpen);
            var yOpen=this.ChartFrame.GetYFromData(data.Open/firstOverlayOpen*firstOpen);
            var yClose=this.ChartFrame.GetYFromData(data.Close/firstOverlayOpen*firstOpen);
            var y=yHigh;

            if (data.Open<data.Close)       //阳线
            {
                var bDrawLine=false;
                if (data.High>data.Close)   //上影线
                {
                    this.Canvas.moveTo(x,y);
                    this.Canvas.lineTo(x,yClose);
                    y=yClose;
                }
                else
                {
                    y=yClose;
                }

                
                this.Canvas.fillRect(left,y,dataWidth,yOpen-y);

                if (data.Open>data.Low)
                {
                    this.Canvas.moveTo(x,y);
                    this.Canvas.lineTo(x,yLow);
                }
            }
            else if (data.Open>data.Close)  //阴线
            {
                this.Canvas.strokeStyle=this.Color;  
                if (data.High>data.Close)   //上影线
                {
                    this.Canvas.moveTo(x,y);
                    this.Canvas.lineTo(x,yOpen);
                    y=yOpen;
                }
                else
                {
                    y=yOpen
                }

                this.Canvas.fillStyle=this.Color;
                this.Canvas.fillRect(left,y,dataWidth,yClose-y);

                if (data.Open>data.Low) //下影线
                {
                    this.Canvas.moveTo(x,y);
                    this.Canvas.lineTo(x,yLow);
                }
            }
            else // 平线
            {
                this.Canvas.strokeStyle=this.Color;
                this.Canvas.beginPath();
                if (data.High>data.Close)   //上影线
                {
                    this.Canvas.moveTo(x,y);
                    this.Canvas.lineTo(x,yOpen);
                   
                    y=yOpen;
                }
                else
                {
                    y=yOpen;
                }

                this.Canvas.moveTo(left,y);
                this.Canvas.lineTo(right,y);

                if (data.Open>data.Low) //下影线
                {
                    this.Canvas.moveTo(x,y);
                    this.Canvas.lineTo(x,yLow);
                }
            }
            
            //添加tooltip区域
            {
                var yTop=Math.min(yLow,yHigh,yOpen,yClose);
                var yBottom=Math.max(yLow,yHigh,yOpen,yClose);
                var rect=new Rect(left,yTop,dataWidth,yBottom-yTop);
                //this.Canvas.fillStyle="rgb(0,0,100)";
                //this.Canvas.fillRect(rect.X,rect.Y,rect.Width,rect.Height);
                this.TooltipRect.push([i,rect]);    //[0]数据索引 [1]数据区域
            }
        }

        if (isFristDraw==false) this.Canvas.stroke();     
    }

    this.GetMaxMin=function()
    {
        var xPointCount=this.ChartFrame.XPointCount;
        var range={};
        range.Max=null;
        range.Min=null;

        if (!this.MainData) return range;

        var firstOpen=null; //主线数据第1个收盘价
        for(var i=this.Data.DataOffset,j=0;i<this.MainData.Data.length && j<xPointCount;++i,++j)
        {
            var data=this.MainData.Data[i];
            if (data.Open==null || data.High==null || data.Low==null || data.Close==null) continue;
            firstOpen=data.Close;
            break;
        }

        if (firstOpen==null) return range;

        var firstOverlayOpen=null;
        var high,low;
        for(var i=this.Data.DataOffset,j=0;i<this.Data.Data.length && j<xPointCount;++i,++j)
        {
            var data=this.Data.Data[i];
            if (!data || data.Open==null || data.High==null || data.Low==null || data.Close==null) continue;
            if (firstOverlayOpen==null) firstOverlayOpen=data.Open;

            high=data.High/firstOverlayOpen*firstOpen;
            low=data.Low/firstOverlayOpen*firstOpen;
            if (range.Max==null) range.Max=high;
            if (range.Min==null) range.Min=low;

            if (range.Max<high) range.Max=high;
            if (range.Min>low) range.Min=low;
        }

        return range;
    }

    this.GetTooltipData=function(x,y,tooltip)
    {
        for(var i in this.TooltipRect)
        {
            var rect=this.TooltipRect[i][1];
            this.Canvas.beginPath();
            this.Canvas.rect(rect.X,rect.Y,rect.Width,rect.Height);
            if (this.Canvas.isPointInPath(x,y))
            {
                var index=this.TooltipRect[i][0];
                tooltip.Data=this.Data.Data[index];
                tooltip.ChartPaint=this;
                return true;
            }
        }
        return false;
    }
}

//历史成交量柱子
function ChartKVolumeBar()
{
    this.newMethod=IChartPainting;   //派生
    this.newMethod();
    delete this.newMethod;

    this.UpColor=g_JSChartResource.UpBarColor;
    this.DownColor=g_JSChartResource.DownBarColor;  

    this.Draw=function()
    {
        var dataWidth=this.ChartFrame.DataWidth;
        var distanceWidth=this.ChartFrame.DistanceWidth;
        var xOffset=this.ChartBorder.GetLeft()+distanceWidth/2.0+2.0;
        var chartright=this.ChartBorder.GetRight();
        var xPointCount=this.ChartFrame.XPointCount;

        var yBottom=this.ChartFrame.GetYFromData(0);
        for(var i=this.Data.DataOffset,j=0;i<this.Data.Data.length && j<xPointCount;++i,++j,xOffset+=(dataWidth+distanceWidth))
        {
            var data=this.Data.Data[i];
            if (data.Vol==null) continue;

            var left=xOffset;
            var right=xOffset+dataWidth;
            if (right>chartright) break;

            var y=this.ChartFrame.GetYFromData(data.Vol);

            if (data.Close>data.Open) 
                this.Canvas.fillStyle=this.UpColor;
            else 
                this.Canvas.fillStyle=this.DownColor;
            this.Canvas.fillRect(left,y,dataWidth,yBottom-y);
        }
    }

    this.GetMaxMin=function()
    {
        var xPointCount=this.ChartFrame.XPointCount;
        var range={};
        range.Min=0;
        range.Max=null;
        for(var i=this.Data.DataOffset,j=0;i<this.Data.Data.length && j<xPointCount;++i,++j)
        {
            var data=this.Data.Data[i];
            if (range.Max==null) range.Max=data.Vol;

            if (range.Max<data.Vol) range.Max=data.Vol;
        }

        return range;
    }
}

//分钟成交量
function ChartMinuteVolumBar()
{
    this.newMethod=IChartPainting;   //派生
    this.newMethod();
    delete this.newMethod;

    this.Color="rgb(200,200,200)";

    this.Draw=function()
    {
        var chartright=this.ChartBorder.GetRight();
        var xPointCount=this.ChartFrame.XPointCount;

        var yBottom=this.ChartFrame.GetYFromData(0);
        
        var drawCount=0;
        for(var i=this.Data.DataOffset,j=0;i<this.Data.Data.length && j<xPointCount;++i,++j)
        {
            var vol=this.Data.Data[i];
            if (!vol) continue;

            var y=this.ChartFrame.GetYFromData(vol);
            var x=this.ChartFrame.GetXFromIndex(i);
            if (y>chartright) break;

            if (drawCount==0) this.Canvas.beginPath();

            this.Canvas.moveTo(x,y);
            this.Canvas.lineTo(x,yBottom);

            ++drawCount;
        }

        if (drawCount>0)
        {
            this.Canvas.strokeStyle=this.Color;
            this.Canvas.stroke();
        }
    }

    this.GetMaxMin=function()
    {
        var xPointCount=this.ChartFrame.XPointCount;
        var range={};
        range.Min=0;
        range.Max=null;
        for(var i=this.Data.DataOffset,j=0;i<this.Data.Data.length && j<xPointCount;++i,++j)
        {
            var vol=this.Data.Data[i];
            if (range.Max==null) range.Max=vol;

            if (range.Max<vol) range.Max=vol;
        }

        return range;
    }
}


//线段
function ChartLine()
{
    this.newMethod=IChartPainting;   //派生
    this.newMethod();
    delete this.newMethod;

    this.Color="rgb(255,193,37)"; //线段颜色

    this.Draw=function()
    {
        var dataWidth=this.ChartFrame.DataWidth;
        var distanceWidth=this.ChartFrame.DistanceWidth;
        var chartright=this.ChartBorder.GetRight();
        var xPointCount=this.ChartFrame.XPointCount;

        var bFirstPoint=true;
        var drawCount=0;
        for(var i=this.Data.DataOffset,j=0;i<this.Data.Data.length && j<xPointCount;++i,++j)
        {
            var value=this.Data.Data[i];
            if (value==null) continue;

            var x=this.ChartFrame.GetXFromIndex(j);
            var y=this.ChartFrame.GetYFromData(value);

            if (bFirstPoint)
            {
                this.Canvas.strokeStyle=this.Color; 
                this.Canvas.beginPath();
                this.Canvas.moveTo(x,y);
                bFirstPoint=false;
            }
            else
            {
                this.Canvas.lineTo(x,y);
            }

            ++drawCount;
        }

        if (drawCount>0)
            this.Canvas.stroke();
    }
}

//分钟线
function ChartMinutePriceLine()
{
    this.newMethod=ChartLine;   //派生
    this.newMethod();
    delete this.newMethod;

    this.YClose;

    this.GetMaxMin=function()
    {
        var xPointCount=this.ChartFrame.XPointCount;
        var range={};
        if (this.YClose==null) return range;

        range.Min=this.YClose;
        range.Max=this.YClose;
        for(var i=this.Data.DataOffset,j=0;i<this.Data.Data.length && j<xPointCount;++i,++j)
        {
            var value=this.Data.Data[i];
            if (range.Max==null) range.Max=value;
            if (range.Min==null) range.Min=value;

            if (range.Max<value) range.Max=value;
            if (range.Min>value) range.Min=value;
        }

        if (range.Max==this.YClose && range.Min==this.YClose) 
        {
            range.Max=this.YClose+this.YClose*0.1;
            range.Min=this.YClose-this.YClose*0.1;
            return range;
        }

        var distance=Math.max(Math.abs(this.YClose-range.Max),Math.abs(this.YClose-range.Min));
        range.Max=this.YClose+distance;
        range.Min=this.YClose-distance;

        return range;
    }
}

//MACD森林线
function ChartMACD()
{
    this.newMethod=IChartPainting;   //派生
    this.newMethod();
    delete this.newMethod;

    this.UpColor=g_JSChartResource.UpBarColor;
    this.DownColor=g_JSChartResource.DownBarColor;

    this.Draw=function()
    {
        var dataWidth=this.ChartFrame.DataWidth;
        var distanceWidth=this.ChartFrame.DistanceWidth;
        var chartright=this.ChartBorder.GetRight();
        var xPointCount=this.ChartFrame.XPointCount;

        var bFirstPoint=true;
        var drawCount=0;
        var yBottom=this.ChartFrame.GetYFromData(0);
        for(var i=this.Data.DataOffset,j=0;i<this.Data.Data.length && j<xPointCount;++i,++j)
        {
            var value=this.Data.Data[i];
            if (value==null) continue;

            var x=this.ChartFrame.GetXFromIndex(j);
            var y=this.ChartFrame.GetYFromData(value);

            if (value>=0) this.Canvas.strokeStyle=this.UpColor; 
            else this.Canvas.strokeStyle=this.DownColor; 
            this.Canvas.beginPath();
            this.Canvas.moveTo(x,yBottom);
            this.Canvas.lineTo(x,y);
            this.Canvas.stroke();
        }
    }
}


/*
    扩展图形
*/

function IExtendChartPainting()
{
    this.Canvas;                        //画布
    this.ChartBorder;                   //边框信息
    this.ChartFrame;                    //框架画法
    this.Name;                          //名称
    this.Data=new ChartData();          //数据区

    //上下左右间距
    this.Left=5;
    this.Right=5;
    this.Top=5;
    this.Bottom=5;									

    this.Draw=function()
    {

    }

}

function StockInfoExtendChartPaint()
{
    this.newMethod=IExtendChartPainting;   //派生
    this.newMethod();
    delete this.newMethod;

    this.Left=80;
    this.Right=1;
    this.Top=1;
    this.Bottom=1;

    this.BorderColor=g_JSChartResource.FrameBorderPen;

    this.Symbol;
    this.Name;

    this.TitleFont=["14px 微软雅黑"];

    this.Draw=function()
    {
        var left=this.ChartBorder.GetRight()+this.Left;
        var right=this.ChartBorder.GetChartWidth()-this.Right;
        var y=this.Top+18;
        var middle=left+(right-left)/2;

        if (this.Symbol && this.Name)
        {
            this.Canvas.font=this.TitleFont[0];

            this.Canvas.textAlign="right";
            this.Canvas.textBaseline="bottom";
            this.Canvas.fillText(this.Symbol,middle-2,y);

            this.Canvas.textAlign="left";
            this.Canvas.fillText(this.Name,middle+2,y);
        }
        ;
        this.Canvas.strokeStyle=this.BorderColor;
        this.Canvas.moveTo(left,y);
        this.Canvas.lineTo(right,y);
        this.Canvas.stroke();
        
        y+=30;

        this.DrawBorder();
    }

    this.DrawBorder=function()
    {
        var left=this.ChartBorder.GetRight()+this.Left;
        var right=this.ChartBorder.GetChartWidth()-this.Right;
        var top=this.Top;
        var bottom=this.ChartBorder.GetChartHeight()-this.Bottom;

        this.Canvas.strokeStyle=this.BorderColor;
        this.Canvas.strokeRect(left,top,(right-left),(bottom-top));
    }
}

/////////////////////////////////////////////////////////////////////////////////////////////////////
//坐标分割
//
//
////////////////////////////////////////////////////////////////////////////////////////////////////
function IFrameSplitOperator()
{
    this.ChartBorder;                   //边框信息
    this.Frame;                         //框架信息

    //////////////////////
    // data.Min data.Max data.Interval data.Count
    //
    this.IntegerCoordinateSplit=function(data)
    {
        var splitItem=g_SplitData.Find(data.Interval);
        if (!splitItem) return false;
        
        if (data.Interval==splitItem.Interval) return true;

        //调整到整数倍数,不能整除的 +1
        var fixMax=parseInt((data.Max/(splitItem.FixInterval)+0.5).toFixed(0))*splitItem.FixInterval;
        var fixMin=parseInt((data.Min/(splitItem.FixInterval)-0.5).toFixed(0))*splitItem.FixInterval;
        if (data.Min==0) fixMin=0;  //最小值是0 不用调整了.
    
        var count=0;
        for(var i=fixMin;(i-fixMax)<0.00000001;i+=splitItem.FixInterval)
        {
            ++count;
        }
    
        data.Interval=splitItem.FixInterval;
        data.Max=fixMax;
        data.Min=fixMin;
        data.Count=count;

        return true;
    }
}

//数据输出格式化 floatPrecision=小数位数
IFrameSplitOperator.FormatValueString=function(value, floatPrecision)
{
    if (value<0.00000000001 && value>-0.00000000001)
    {
        return "0";
    }

    var absValue = Math.abs(value);
    if (absValue < 10000)
    {
        return value.toFixed(floatPrecision);
    }
    else if (absValue < 100000000)
    {
        return (value/10000).toFixed(floatPrecision)+"万";
    }
    else if (absValue < 1000000000000)
    {
        return (value/100000000).toFixed(floatPrecision)+"亿";
    }
    else
    {
        return (value/1000000000000).toFixed(floatPrecision)+"万亿";
    }

    return TRUE;
}

IFrameSplitOperator.FormatDateString=function(value)
{
    var year=parseInt(value/10000);
    var month=parseInt(value/100)%100;
    var day=value%100;

    return year.toString()+'-'+month.toString()+'-'+day.toString();
}

IFrameSplitOperator.FormatDateTimeString=function(value)
{
    var aryValue=value.split(' ');
    if (aryValue.length<2) return "";
    var time=parseInt(aryValue[1]);
    var minute=time%100;
    if (minute<10 ) 
        return parseInt(time/100).toString()+":"+minute+"0";
    else 
        return parseInt(time/100).toString()+":"+minute;
}

function FrameSplitKLinePriceY()
{
    this.newMethod=IFrameSplitOperator;   //派生
    this.newMethod();
    delete this.newMethod;

    //////////////////////
    // data.Min data.Max data.Interval data.Count
    //
    this.IntegerCoordinateSplit=function(data)
    {
        var splitItem=g_PriceSplitData.Find(data.Interval);
        if (!splitItem) return false;
        
        if (data.Interval==splitItem.Interval) return true;

        //调整到整数倍数,不能整除的 +1
        var fixMax=parseInt((data.Max/(splitItem.FixInterval)+0.5).toFixed(0))*splitItem.FixInterval;
        var fixMin=parseInt((data.Min/(splitItem.FixInterval)-0.5).toFixed(0))*splitItem.FixInterval;
        if (data.Min==0) fixMin=0;
    
        var count=0;
        for(var i=fixMin;(i-fixMax)<0.00000001;i+=splitItem.FixInterval)
        {
            ++count;
        }
    
        data.Interval=splitItem.FixInterval;
        data.Max=fixMax;
        data.Min=fixMin;
        data.Count=count;

        return true;
    }

    this.Operator=function()
    {
        var splitData={};
        splitData.Max=this.Frame.HorizontalMax;
        splitData.Min=this.Frame.HorizontalMin;
        splitData.Count=5;
        splitData.Interval=(splitData.Max-splitData.Min)/splitData.Count;
        this.IntegerCoordinateSplit(splitData);

        this.Frame.HorizontalInfo=[];
        
        for(var i=0,value=splitData.Min;i<splitData.Count;++i,value+=splitData.Interval)
        {
            this.Frame.HorizontalInfo[i]= new CoordinateInfo();
            this.Frame.HorizontalInfo[i].Value=value;

            this.Frame.HorizontalInfo[i].Message[1]=value.toFixed(2);
            //this.Frame.HorizontalInfo[i].Font="14px 微软雅黑";
            //this.Frame.HorizontalInfo[i].TextColor="rgb(100,0,200)";
            //this.Frame.HorizontalInfo[i].LineColor="rgb(220,220,220)";
        }

        this.Frame.HorizontalMax=splitData.Max;
        this.Frame.HorizontalMin=splitData.Min;
    }
    
}

function FrameSplitY()
{
    this.newMethod=IFrameSplitOperator;   //派生
    this.newMethod();
    delete this.newMethod;

    this.Operator=function()
    {
        var splitData={};
        splitData.Max=this.Frame.HorizontalMax;
        splitData.Min=this.Frame.HorizontalMin;
        splitData.Count=5;
        splitData.Interval=(splitData.Max-splitData.Min)/splitData.Count;
        this.IntegerCoordinateSplit(splitData);

        this.Frame.HorizontalInfo=[];
        
        for(var i=0,value=splitData.Min;i<splitData.Count;++i,value+=splitData.Interval)
        {
            this.Frame.HorizontalInfo[i]= new CoordinateInfo();
            this.Frame.HorizontalInfo[i].Value=value;

            this.Frame.HorizontalInfo[i].Message[1]=IFrameSplitOperator.FormatValueString(value,2);
            //this.Frame.HorizontalInfo[i].Font="14px 微软雅黑";
            //this.Frame.HorizontalInfo[i].TextColor="rgb(100,0,200)";
            //this.Frame.HorizontalInfo[i].LineColor="rgb(220,220,220)";
        }

        this.Frame.HorizontalMax=splitData.Max;
        this.Frame.HorizontalMin=splitData.Min;
    }
}

function FrameSplitKLineX()
{
    this.newMethod=IFrameSplitOperator;   //派生
    this.newMethod();
    delete this.newMethod;

    this.ShowText=true;                 //是否显示坐标信息

    this.Operator=function()
    {
        if (this.Frame.Data==null) return;
        this.Frame.VerticalInfo=[];
        var xOffset=this.Frame.Data.DataOffset;
        var xPointCount=this.Frame.XPointCount;

        var lastYear=null, lastMonth=null;
        var minDistance=20;

        for(var i=0, index=xOffset, distance=minDistance;i<xPointCount && index<this.Frame.Data.Data.length ;++i,++index)
        {
            var year=parseInt(this.Frame.Data.Data[index].Date/10000);
            var month=parseInt(this.Frame.Data.Data[index].Date/100)%100;

            if (distance<minDistance ||
                (lastYear!=null && lastYear==year && lastMonth!=null && lastMonth==month)) 
            {
                ++distance;
                continue;
            }

            var info= new CoordinateInfo();
            info.Value=index-xOffset;
            var text;
            if (lastYear==null || lastYear!=year)
            {
                text=year.toString();
            }
            else if (lastMonth==null || lastMonth!=month)
            {
                text=month.toString()+"月";
            }

            lastYear=year;
            lastMonth=month;

            if (this.ShowText)
            {
                info.Message[0]=text;
            }

            this.Frame.VerticalInfo.push(info);
            distance=0;
        }
    }
}

function FrameSplitMinutePriceY()
{
    this.newMethod=IFrameSplitOperator;   //派生
    this.newMethod();
    delete this.newMethod;

    this.YClose;                        //昨收
    this.Data;                          //分钟数据

    this.Operator=function()
    {
        this.Frame.HorizontalInfo=[];
        if (!this.Data) return;
        
        var max=this.YClose;
        var min=this.YClose;

        for(var i in this.Data.Data)
        {
            if (max<this.Data.Data[i]) max=this.Data.Data[i];
            if (min>this.Data.Data[i]) min=this.Data.Data[i];
        }

        if (this.YClose==max && this.YClose==min)
        {
            max=this.YClose+this.YClose*0.1;
            min=this.YClose-this.YClose*0.1
        }
        else
        {
            var distanceValue=Math.max(Math.abs(this.YClose-max),Math.abs(this.YClose-min));
            max=this.YClose+distanceValue;
            min=this.YClose-distanceValue;
        }

        var showCount=7;
        var distance=(max-min)/(showCount-1);
        for(var i=0;i<showCount;++i)
        {
            var price=min+(distance*i);
            this.Frame.HorizontalInfo[i]= new CoordinateInfo();
            this.Frame.HorizontalInfo[i].Value=price;

            if (i>0) 
            {
                this.Frame.HorizontalInfo[i].Message[0]=IFrameSplitOperator.FormatValueString(price,2);
                var per=(price/this.YClose-1)*100;
                if (per>0) this.Frame.HorizontalInfo[i].TextColor=g_JSChartResource.UpTextColor;
                else if (per<0) this.Frame.HorizontalInfo[i].TextColor=g_JSChartResource.DownTextColor;
                this.Frame.HorizontalInfo[i].Message[1]=IFrameSplitOperator.FormatValueString(per,2)+'%'; //百分比
            }
        }
    }

}

var SHZE_MINUTE_X_COORDINATE=
[
    [0,     0,"rgb(200,200,200)",   "09:30"],
    [31,	0,"RGB(200,200,200)",	"10:00"],
	[61,	0,"RGB(200,200,200)",	"10:30"],
	[91,	0,"RGB(200,200,200)",	"11:00"],
	[122,	1,"RGB(200,200,200)",	"13:00"],
	[152,	0,"RGB(200,200,200)",	"13:30"],
	[182,	0,"RGB(200,200,200)",	"14:00"],
	[212,	0,"RGB(200,200,200)",	"14:30"],
	[242,	1,"RGB(200,200,200)",	""], // 15:00
];

function FrameSplitMinuteX()
{
    this.newMethod=IFrameSplitOperator;   //派生
    this.newMethod();
    delete this.newMethod;

    this.ShowText=true;                 //是否显示坐标信息

    this.Operator=function()
    {
        this.Frame.VerticalInfo=[];
        var xPointCount=this.Frame.XPointCount;

        for(var i in SHZE_MINUTE_X_COORDINATE)
        {
            var info=new CoordinateInfo();
            info.Value=SHZE_MINUTE_X_COORDINATE[i][0];
            if (this.ShowText)
                info.Message[0]=SHZE_MINUTE_X_COORDINATE[i][3];
            this.Frame.VerticalInfo[i]=info;
        }
    }
}


///////////////////////////////////////////////////////////////////////////////////////////////////
//十字光标
function ChartCorssCursor()
{
    this.Frame;
    this.Canvas;                            //画布
    this.PenColor=g_JSChartResource.CorssCursorPenColor;        //十字线颜色
    this.Font=g_JSChartResource.CorssCursorTextFont;            //字体
    this.TextColor=g_JSChartResource.CorssCursorTextColor;      //文本颜色
    this.TextBGColor=g_JSChartResource.CorssCursorBGColor;      //文本背景色        
    this.TextHeight=20;                     //文本字体高度
    this.LastPoint;

    this.PointX;
    this.PointY;

    this.StringFormatX;
    this.StringFormatY;

    this.Draw=function()
    {
        if (!this.LastPoint) return;

        var x=this.LastPoint.X;
        var y=this.LastPoint.Y;

        var isInClient=false;
        this.Canvas.beginPath();
        this.Canvas.rect(this.Frame.ChartBorder.GetLeft(),this.Frame.ChartBorder.GetTop(),this.Frame.ChartBorder.GetWidth(),this.Frame.ChartBorder.GetHeight());
        isInClient=this.Canvas.isPointInPath(x,y);

        this.PointY=null;
        this.PointY==null;

        if (!isInClient) return;

        var left=this.Frame.ChartBorder.GetLeft();
        var right=this.Frame.ChartBorder.GetRight();
        var top=this.Frame.ChartBorder.GetTop();
        var bottom=this.Frame.ChartBorder.GetBottom();

        this.PointY=[[left,y],[right,y]];
        this.PointX=[[x,top],[x,bottom]];

        //十字线
        this.Canvas.strokeStyle=this.PenColor;
        this.Canvas.beginPath();

        this.Canvas.moveTo(left,y);
        this.Canvas.lineTo(right,y);

        this.Canvas.moveTo(x,top);
        this.Canvas.lineTo(x,bottom);

        this.Canvas.stroke();

        var xValue=this.Frame.GetXData(x);
        var yValue=this.Frame.GetYData(y);

        this.StringFormatX.Value=xValue;
        this.StringFormatY.Value=yValue;

        if (this.StringFormatY.Operator())
        {
            var text=this.StringFormatY.Text;
            this.Canvas.font=this.Font;

            this.Canvas.fillStyle=this.TextBGColor;
            var textWidth=this.Canvas.measureText(text).width+4;    //前后各空2个像素
            this.Canvas.fillRect(right+2,y-this.TextHeight/2,textWidth,this.TextHeight);

            this.Canvas.textAlign="left";
            this.Canvas.textBaseline="middle";
            this.Canvas.fillStyle=this.TextColor;
            this.Canvas.fillText(text,right+4,y,textWidth);
        }

        if (this.StringFormatX.Operator())
        {
            var text=this.StringFormatX.Text;
            this.Canvas.font=this.Font;

            this.Canvas.fillStyle=this.TextBGColor;
            var textWidth=this.Canvas.measureText(text).width+4;    //前后各空2个像素
            if (x-textWidth/2<3)    //左边位置不够了, 顶着左边画
            {
                this.Canvas.fillRect(x-1,bottom+2,textWidth,this.TextHeight);
                this.Canvas.textAlign="left";
                this.Canvas.textBaseline="top";
                this.Canvas.fillStyle=this.TextColor;
                this.Canvas.fillText(text,x+1,bottom+2,textWidth);
            }
            else
            {
                this.Canvas.fillRect(x-textWidth/2,bottom+2,textWidth,this.TextHeight);
                this.Canvas.textAlign="center";
                this.Canvas.textBaseline="top";
                this.Canvas.fillStyle=this.TextColor;
                this.Canvas.fillText(text,x,bottom+2,textWidth);
            }
        }
    }
}


/////////////////////////////////////////////////////////////////////////////////
//
function IChangeStringFormat()
{
    this.Data;
    this.Value;     //数据
    this.Text;      //输出字符串

    this.Operator=function()
    {
        return false;
    }
}


function HQPriceStringFormat()
{
    this.newMethod=IChangeStringFormat;   //派生
    this.newMethod();
    delete this.newMethod;

    this.Operator=function()
    {
        if (!this.Value) return false;

        this.Text=IFrameSplitOperator.FormatValueString(this.Value,2);
        return true;
    }
}

function HQDateStringFormat()
{
    this.newMethod=IChangeStringFormat;   //派生
    this.newMethod();
    delete this.newMethod;

    this.Operator=function()
    {
        if (!this.Value) return false;
        if (!this.Data) return false;

        var index=Math.abs(this.Value-0.5);
        index=parseInt(index.toFixed(0));
        if (this.Data.DataOffset+index>=this.Data.Data.length) return false;

        var date=this.Data.Data[this.Data.DataOffset+index].Date;
        this.Text=IFrameSplitOperator.FormatDateString(date);

        return true;
    }
}

function HQMinuteTimeStringFormat()
{
    this.newMethod=IChangeStringFormat;   //派生
    this.newMethod();
    delete this.newMethod;

    this.Operator=function()
    {
        if (!this.Value) return false;

        var index=Math.abs(this.Value);
        index=parseInt(index.toFixed(0));

        if(index == 0)  
        {
            this.Text="9:25";
        }
        else if(index<122) 
        {
            var time=9*60+30+index-1;
            var minute=time%60;
            if (minute<10) this.Text= parseInt(time/60)+":"+minute+'0';
            else this.Text= parseInt(time/60)+":"+minute;
        }
        else if(index<243) 
        {
            var time=13*60+index-122-1;
            var minute=time%60;
            if (minute<10) this.Text= parseInt(time/60)+":"+minute+'0';
            else this.Text= parseInt(time/60)+":"+minute;
        }
        else 
        {
            this.Text="15:00";
        }

        return true;
    }
}


//行情tooltip提示信息格式
var WEEK_NAME=["日","一","二","三","四","五","六"];
function HistoryDataStringFormat()
{
    this.newMethod=IChangeStringFormat;   //派生
    this.newMethod();
    delete this.newMethod;

    this.UpColor=g_JSChartResource.UpTextColor;
    this.DownColor=g_JSChartResource.DownTextColor;   
    this.UnchagneColor=g_JSChartResource.UnchagneTextColor;  
    
    this.VolColor=g_JSChartResource.DefaultTextColor;
    this.AmountColor=g_JSChartResource.DefaultTextColor;

    this.Operator=function()
    {
        var data=this.Value.Data;
        if (!data) return false;

        var date=new Date(parseInt(data.Date/10000),(data.Date/100%100-1),data.Date%100);
        var week=WEEK_NAME[date.getDay()];
        var strText="<span style='color:rgb(0,0,0);font:微软雅黑;font-size:12px;text-align:center;display: block;'>"+data.Date+"&nbsp&nbsp"+week+"</span>"+
                    "<span style='color:"+this.GetColor(data.Open,data.YClose)+";font:微软雅黑;font-size:12px'>&nbsp;开盘: "+data.Open.toFixed(2)+"</span><br/>"+
                    "<span style='color:"+this.GetColor(data.High,data.YClose)+";font:微软雅黑;font-size:12px'>&nbsp;最高: "+data.High.toFixed(2)+"</span><br/>"+
                    "<span style='color:"+this.GetColor(data.Low,data.YClose)+";font:微软雅黑;font-size:12px'>&nbsp;最低: "+data.Low.toFixed(2)+"</span><br/>"+
                    "<span style='color:"+this.GetColor(data.Close,data.YClose)+";font:微软雅黑;font-size:12px'>&nbsp;收盘: "+data.Close.toFixed(2)+"</span><br/>"+
                    //"<span style='color:"+this.YClose+";font:微软雅黑;font-size:12px'>&nbsp;前收: "+IFrameSplitOperator.FormatValueString(data.YClose,2)+"</span><br/>"+
                    "<span style='color:"+this.VolColor+";font:微软雅黑;font-size:12px'>&nbsp;数量: "+IFrameSplitOperator.FormatValueString(data.Vol,2)+"</span><br/>"+
                    "<span style='color:"+this.AmountColor+";font:微软雅黑;font-size:12px'>&nbsp;金额: "+IFrameSplitOperator.FormatValueString(data.Amount,2)+"</span><br/>";
        
        //叠加股票
        if (this.Value.ChartPaint.Name=="Overlay-KLine")
        {
            var title="<span style='color:rgb(0,0,0);font:微软雅黑;font-size:12px;text-align:center;display: block;'>"+this.Value.ChartPaint.Title+"</span>";
            strText=title+strText;
        }

        this.Text=strText;
        return true;
    }

    this.GetColor=function(price,yclse)
    {
        if(price>yclse) return this.UpColor;
        else if (price<yclse) return this.DownColor;
        else return this.UnchagneColor;
    }
}


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                      标题
//
//
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////

function IChartTitlePainting()
{
    this.Frame;
    this.Data=new Array();
    this.Canvas;                        //画布
    this.IsDynamic=false;               //是否是动态标题
    this.Position=0;                    //标题显示位置 0 框架里的标题  1 框架上面
    this.CursorIndex;                   //数据索引
    this.Font="13px 微软雅黑";
    this.Title;                         //固定标题(可以为空)
    this.TitleColor=g_JSChartResource.DefaultTextColor;
}

var PERIOD_NAME=["日线","周线","月线","年线"];
var RIGHT_NAME=['不复权','前复权','后复权'];

function DynamicKLineTitlePainting()
{
    this.newMethod=IChartTitlePainting;   //派生
    this.newMethod();
    delete this.newMethod;

    this.IsDynamic=true;
    this.IsShow=true;       //是否显示

    this.UpColor=g_JSChartResource.UpTextColor;
    this.DownColor=g_JSChartResource.DownTextColor;   
    this.UnchagneColor=g_JSChartResource.UnchagneTextColor;   

    this.VolColor=g_JSChartResource.DefaultTextColor;
    this.AmountColor=g_JSChartResource.DefaultTextColor;

    this.Symbol;
    this.Name;

    this.Draw=function()
    {
        if (!this.IsShow) return;
        if (this.CursorIndex==null || !this.Data) return;
        if (this.Data.length<=0) return;

        var index=Math.abs(this.CursorIndex-0.5);
        index=parseInt(index.toFixed(0));
        if (this.Data.DataOffset+index>=this.Data.Data.length) return false;

        var item=this.Data.Data[this.Data.DataOffset+index];

        var left=this.Frame.ChartBorder.GetLeft();
        var bottom=this.Frame.ChartBorder.GetTop();

        this.Canvas.textAlign="left";
        this.Canvas.textBaseline="bottom";
        this.Canvas.font=this.Font;

        this.Canvas.fillStyle=this.UnchagneColor;
        var textWidth=this.Canvas.measureText(this.Name).width+2;    //后空2个像素
        this.Canvas.fillText(this.Name,left,bottom,textWidth);
        left+=textWidth;

        this.Canvas.fillStyle=this.UnchagneColor;
        var periodName=PERIOD_NAME[this.Data.Period];
        var rightName=RIGHT_NAME[this.Data.Right];
        var text="("+periodName+" "+rightName+")";
        var textWidth=this.Canvas.measureText(text).width+2;        
        this.Canvas.fillText(text,left,bottom,textWidth);
        left+=textWidth;

        this.Canvas.fillStyle=this.UnchagneColor;
        var text=IFrameSplitOperator.FormatDateString(item.Date);
        var textWidth=this.Canvas.measureText(text).width+2;    //后空2个像素
        this.Canvas.fillText(text,left,bottom,textWidth);
        left+=textWidth;

        this.Canvas.fillStyle=this.GetColor(item.Open,item.YClose);
        var text="开:"+item.Open.toFixed(2);
        var textWidth=this.Canvas.measureText(text).width+2;    //后空2个像素
        this.Canvas.fillText(text,left,bottom,textWidth);
        left+=textWidth;

        this.Canvas.fillStyle=this.GetColor(item.High,item.YClose);
        var text="高:"+item.High.toFixed(2);
        var textWidth=this.Canvas.measureText(text).width+2;    //后空2个像素
        this.Canvas.fillText(text,left,bottom,textWidth);
        left+=textWidth;

        this.Canvas.fillStyle=this.GetColor(item.Low,item.YClose);
        var text="低:"+item.Low.toFixed(2);
        var textWidth=this.Canvas.measureText(text).width+2;    //后空2个像素
        this.Canvas.fillText(text,left,bottom,textWidth);
        left+=textWidth;

        this.Canvas.fillStyle=this.GetColor(item.Close,item.YClose);
        var text="收:"+item.Close.toFixed(2);
        var textWidth=this.Canvas.measureText(text).width+2;    //后空2个像素
        this.Canvas.fillText(text,left,bottom,textWidth);
        left+=textWidth;

        this.Canvas.fillStyle=this.VolColor;
        var text="量:"+IFrameSplitOperator.FormatValueString(item.Vol,2);
        var textWidth=this.Canvas.measureText(text).width+2;    //后空2个像素
        this.Canvas.fillText(text,left,bottom,textWidth);
        left+=textWidth;

        this.Canvas.fillStyle=this.AmountColor;
        var text="额:"+IFrameSplitOperator.FormatValueString(item.Amount,2);
        var textWidth=this.Canvas.measureText(text).width+2;    //后空2个像素
        this.Canvas.fillText(text,left,bottom,textWidth);
        left+=textWidth;
    }

    this.GetColor=function(price,yclse)
    {
        if(price>yclse) return this.UpColor;
        else if (price<yclse) return this.DownColor;
        else return this.UnchagneColor;
    }

}

function DynamicMinuteTitlePainting()
{
    this.newMethod=DynamicKLineTitlePainting;   //派生
    this.newMethod();
    delete this.newMethod;
    
    this.YClose;

    this.Draw=function()
    {
        if (!this.IsShow) return;
        if (this.CursorIndex==null || !this.Data) return;
        if (this.Data.length<=0) return;

        var index=Math.abs(this.CursorIndex-0.5);
        index=parseInt(index.toFixed(0));
        if (this.Data.DataOffset+index>=this.Data.Data.length) return false;

        var item=this.Data.Data[this.Data.DataOffset+index];

        var left=this.Frame.ChartBorder.GetLeft();
        var bottom=this.Frame.ChartBorder.GetTop();

        this.Canvas.textAlign="left";
        this.Canvas.textBaseline="bottom";
        this.Canvas.font=this.Font;

        this.Canvas.fillStyle=this.UnchagneColor;
        var textWidth=this.Canvas.measureText(this.Name).width+2;    //后空2个像素
        this.Canvas.fillText(this.Name,left,bottom,textWidth);
        left+=textWidth;

        this.Canvas.fillStyle=this.UnchagneColor;
        var text=IFrameSplitOperator.FormatDateTimeString(item.DateTime);
        var textWidth=this.Canvas.measureText(text).width+2;    //后空2个像素
        this.Canvas.fillText(text,left,bottom,textWidth);
        left+=textWidth;

        this.Canvas.fillStyle=this.GetColor(item.Price,this.YClose);
        var text="价格:"+item.Price.toFixed(2);
        var textWidth=this.Canvas.measureText(text).width+2;    //后空2个像素
        this.Canvas.fillText(text,left,bottom,textWidth);
        left+=textWidth;

        this.Canvas.fillStyle=this.GetColor(item.AvPrice,this.YClose);
        var text="均价:"+item.AvPrice.toFixed(2);
        var textWidth=this.Canvas.measureText(text).width+2;    //后空2个像素
        this.Canvas.fillText(text,left,bottom,textWidth);
        left+=textWidth;

        this.Canvas.fillStyle=this.VolColor;
        var text="量:"+IFrameSplitOperator.FormatValueString(item.Vol,2);
        var textWidth=this.Canvas.measureText(text).width+2;    //后空2个像素
        this.Canvas.fillText(text,left,bottom,textWidth);
        left+=textWidth;

        this.Canvas.fillStyle=this.AmountColor;
        var text="额:"+IFrameSplitOperator.FormatValueString(item.Amount,2);
        var textWidth=this.Canvas.measureText(text).width+2;    //后空2个像素
        this.Canvas.fillText(text,left,bottom,textWidth);
        left+=textWidth;
    }
}

function DynamicTitleData(data,name,color)
{
    this.Data=data;
    this.Name=name;
    this.Color=color;   //字体颜色
    this.DataType;      //数据类型
}

function DynamicChartTitlePainting()
{
    this.newMethod=IChartTitlePainting;   //派生
    this.newMethod();
    delete this.newMethod;

    this.IsDynamic=true;
    this.Data=new Array(); 

    this.Draw=function()
    {
        if (this.CursorIndex==null ) return;
        if (!this.Data) return;

        var left=this.Frame.ChartBorder.GetLeft()+1;
        var bottom=this.Frame.ChartBorder.GetTopEx();

        this.Canvas.textAlign="left";
        this.Canvas.textBaseline="bottom";
        this.Canvas.font=this.Font;

        if (this.Title)
        {
            this.Canvas.fillStyle=this.TitleColor;
            var textWidth=this.Canvas.measureText(this.Title).width+2; 
            this.Canvas.fillText(this.Title,left,bottom,textWidth);
            left+=textWidth;
        }

        for(var i in this.Data)
        {
            var item=this.Data[i];
            if (!item || !item.Data) continue;

            if (item.Data.Data.length<=0) continue;
    
            var index=Math.abs(this.CursorIndex-0.5);
            index=parseInt(index.toFixed(0));
            if (item.Data.DataOffset+index>=item.Data.Data.length) continue;
    
            var value=item.Data.Data[item.Data.DataOffset+index];
            if (value==null) continue;

            if (item.DataType=="HistoryData-Vol") 
                value=value.Vol;

            this.Canvas.fillStyle=item.Color;
            var text=item.Name+":"+IFrameSplitOperator.FormatValueString(value,2);
            var textWidth=this.Canvas.measureText(text).width+2;    //后空2个像素
            this.Canvas.fillText(text,left,bottom,textWidth);
            left+=textWidth;
        }
    }
}

/////////////////////////////////////////////////////////////////////////////////////////////////////////
//  数据分割
//  [0]=Start起始 [1]=End结束 [2]=FixInterval修正的间隔 [3]=Increase
//
function SplitData()
{
    this.Data=[
        [0.000001,	0.000002,	0.000001,	0.0000001],
        [0.000002,	0.000004,	0.000002,	0.0000002],
        [0.000004,	0.000005,	0.000004,	0.0000001],
        [0.000005,	0.00001,	0.000005,	0.0000005],
    
        [0.00001,	0.00002,	0.00001,	0.000001],
        [0.00002,	0.00004,	0.00002,	0.000002],
        [0.00004,	0.00005,	0.00004,	0.000001],
        [0.00005,	0.0001,		0.00005,	0.000005],
    
        [0.0001,		0.0002,		0.0001,	0.00001],
        [0.0002,		0.0004,		0.0002,	0.00002],
        [0.0004,		0.0005,		0.0004,	0.00001],
        [0.0005,		0.001,		0.0005,	0.00005],
    
        [0.001,		0.002,		0.001,	0.0001],
        [0.002,		0.004,		0.002,	0.0002],
        [0.004,		0.005,		0.004,	0.0001],
        [0.005,		0.01,		0.005,	0.0005],
    
        [0.01,		0.02,		0.01,	0.001],
        [0.02,		0.04,		0.02,	0.002],
        [0.04,		0.05,		0.04,	0.001],
        [0.05,		0.1,		0.05,	0.005],
    
        [0.1,		0.2,		0.1,	0.01],
        [0.2,		0.4,		0.2,	0.02],
        [0.4,		0.5,		0.4,	0.01],
        [0.5,		1,			0.5,	0.05],
    
        [1,		2,		1,	0.05],
        [2,		4,		2,	0.05],
        [4,		5,		4,	0.05],
        [5,		10,		5,	0.05],

        [10,		12,		10,	2],
        [20,		40,		20,	5],
        [40,		50,		40,	2],
        [50,		100,	50,	10],
    
        [100,		200,		100,	10],
        [200,		400,		200,	20],
        [400,		500,		400,	10],
        [500,		1000,		500,	50],

        [1000,		2000,		1000,	50],
        [2000,		4000,		2000,	50],
        [4000,		5000,		4000,	50],
        [5000,		10000,		5000,	100],
    
        [10000,		20000,		10000,	1000],
        [20000,		40000,		20000,	2000],
        [40000,		50000,		40000,	1000],
        [50000,		100000,		50000,	5000],

        [100000,		200000,		100000,	10000],
        [200000,		400000,		200000,	20000],
        [400000,		500000,		400000,	10000],
        [500000,		1000000,	500000,	50000],
    
        [1000000,		2000000,		1000000,	100000],
        [2000000,		4000000,		2000000,	200000],
        [4000000,		5000000,		4000000,	100000],
        [5000000,		10000000,		5000000,	500000],

        [10000000,		20000000,		10000000,	1000000],
        [20000000,		40000000,		20000000,	2000000],
        [40000000,		50000000,		40000000,	1000000],
        [50000000,		100000000,		50000000,	5000000],
    
        [100000000,		200000000,		100000000,	10000000],
        [200000000,		400000000,		200000000,	20000000],
        [400000000,		500000000,		400000000,	10000000],
        [500000000,		1000000000,		500000000,	50000000],

        [1000000000,		2000000000,		1000000000,	100000000],
        [2000000000,		4000000000,		2000000000,	200000000],
        [4000000000,		5000000000,		4000000000,	100000000],
        [5000000000,		10000000000,	5000000000,	500000000],
    ];

    this.Find=function(interval)
    {
        for(var i in this.Data)
        {
            var item =this.Data[i];
            if (interval>item[0] && interval<=item[1])
            {
                var result={};
                result.FixInterval=item[2];
                result.Increase=item[3];
                return result;
            }
        }

        return null;
    }
}

function PriceSplitData()
{
    this.newMethod=SplitData;   //派生
    this.newMethod();
    delete this.newMethod;

    this.Data=[
        [0.000001,	0.000002,	0.000001,	0.0000001],
        [0.000002,	0.000004,	0.000002,	0.0000002],
        [0.000004,	0.000005,	0.000004,	0.0000001],
        [0.000005,	0.00001,	0.000005,	0.0000005],
    
        [0.00001,	0.00002,	0.00001,	0.000001],
        [0.00002,	0.00004,	0.00002,	0.000002],
        [0.00004,	0.00005,	0.00004,	0.000001],
        [0.00005,	0.0001,		0.00005,	0.000005],
    
        [0.0001,		0.0002,		0.0001,	0.00001],
        [0.0002,		0.0004,		0.0002,	0.00002],
        [0.0004,		0.0005,		0.0004,	0.00001],
        [0.0005,		0.001,		0.0005,	0.00005],
    
        [0.001,		0.002,		0.001,	0.0001],
        [0.002,		0.004,		0.002,	0.0002],
        [0.004,		0.005,		0.004,	0.0001],
        [0.005,		0.01,		0.005,	0.0005],
    
        [0.01,		0.02,		0.01,	0.001],
        [0.02,		0.04,		0.02,	0.002],
        [0.04,		0.05,		0.04,	0.001],
        [0.05,		0.1,		0.05,	0.005],
    
        [0.1,		1,			0.5,	0.05],
    
        [1,		2,		1,	0.05],
        [2,		4,		2,	0.05],
        [4,		5,		4,	0.05],
        [5,		10,		5,	0.05],

        [10,		12,		10,	2],
        [20,		40,		20,	5],
        [40,		50,		40,	2],
        [50,		100,	50,	10],
    
        [100,		200,		100,	10],
        [200,		400,		200,	20],
        [400,		500,		400,	10],
        [500,		1000,		500,	50],

        [1000,		2000,		1000,	50],
        [2000,		4000,		2000,	50],
        [4000,		5000,		4000,	50],
        [5000,		10000,		5000,	100],
    
        [10000,		20000,		10000,	1000],
        [20000,		40000,		20000,	2000],
        [40000,		50000,		40000,	1000],
        [50000,		100000,		50000,	5000],

        [100000,		200000,		100000,	10000],
        [200000,		400000,		200000,	20000],
        [400000,		500000,		400000,	10000],
        [500000,		1000000,	500000,	50000],
    
        [1000000,		2000000,		1000000,	100000],
        [2000000,		4000000,		2000000,	200000],
        [4000000,		5000000,		4000000,	100000],
        [5000000,		10000000,		5000000,	500000],

        [10000000,		20000000,		10000000,	1000000],
        [20000000,		40000000,		20000000,	2000000],
        [40000000,		50000000,		40000000,	1000000],
        [50000000,		100000000,		50000000,	5000000],
    
        [100000000,		200000000,		100000000,	10000000],
        [200000000,		400000000,		200000000,	20000000],
        [400000000,		500000000,		400000000,	10000000],
        [500000000,		1000000000,		500000000,	50000000],

        [1000000000,		2000000000,		1000000000,	100000000],
        [2000000000,		4000000000,		2000000000,	200000000],
        [4000000000,		5000000000,		4000000000,	100000000],
        [5000000000,		10000000000,	5000000000,	500000000],
    ];
}

//全局变量
var g_PriceSplitData=new PriceSplitData();
var g_SplitData=new SplitData();  


/////////////////////////////////////////////////////////////////////////////
//   全局配置颜色
//
//
function JSChartResource()
{
    this.TooltipBGColor="rgb(239,239,239)"; //背景色
    this.TooltipAlpha=0.8;                  //透明度

    this.SelectRectBGColor="rgb(105,105,105)"; //背景色
    this.SelectRectAlpha=0.5;                  //透明度

    this.UpBarColor="rgb(236,95,76)";
    this.DownBarColor="rgb(107,165,131)";   
    this.UnchagneBarColor="rgb(0,0,0)"; 

    this.Minute={};
    this.Minute.VolBarColor="rgb(238,127,9)";
    this.Minute.PriceColor="rgb(50,171,205)";
    this.Minute.AvPriceColor="rgb(238,127,9)";

    this.DefaultTextColor="rgb(120,120,120)";
    
    this.UpTextColor="rgb(236,95,76)";
    this.DownTextColor="rgb(107,165,131)";   
    this.UnchagneTextColor="rgb(0,0,0)"; 

    this.FrameBorderPen="rgb(203,203,203)";
    this.FrameSplitPen="rgb(203,203,203)";      //分割线
    this.FrameSplitTextColor="rgb(52,52,52)";   //刻度文字颜色
    this.FrameSplitTextFont="14px 微软雅黑";     //坐标刻度文字字体

    this.CorssCursorBGColor="rgb(220,220,220)";            //十字光标背景
    this.CorssCursorTextColor="rgb(80,80,80)";
    this.CorssCursorTextFont="14px 微软雅黑";
    this.CorssCursorPenColor="rgb(130,130,130)";           //十字光标线段颜色

    this.Index={};
    //指标线段颜色
    this.Index.LineColor=
    [
        "rgb(255,130,71)",
        "rgb(218,112,214)",
        "rgb(255,52,179)",
        "rgb(0,206,209)",
        "rgb(148,0,211)",
        "rgb(34,139,34)"
    ];
   
}

var g_JSChartResource=new JSChartResource();


////////////////////////////////////////////////////////////////////////////////////////////////
//      指标计算方法
//
//
//

function HQIndexFormula()
{

}

//指数平均数指标 EMA(close,10)
HQIndexFormula.EMA=function(data,dayCount)
{
    var result = [];

    var offset=0;
    if (offset>=data.length) return result;

    var p1Index=offset;
    var p2Index=offset+1;

    result[p1Index]=data[p1Index];
    for(var i=offset+1;i<data.length;++i,++p1Index,++p2Index)
    {
        result[p2Index]=((2*data[p2Index]+(dayCount-1)*result[p1Index]))/(dayCount+1);
    }

    return result; 
}

HQIndexFormula.SMA=function(data,n,m)
{
    var result = [];
    
    var i=0;
    var lastData=data[i];
    
    for(++i;i<data.length;++i)
    {
        result[i]=(m*data[i]+(n-m)*lastData)/n;
        lastData=result[i];
        if (isNaN(lastData) || lastData==null) lastData=0;
    }

    return result;
}


HQIndexFormula.HHV=function(data,n)
{
    var result = [];
    if (n>data.length) return result;

    var max=-10000;
    for(var i=n,j=0;i<data.length;++i,++j)
    {
        if(i<n+max) 
        {
            max=data[i]<data[max]?max:i;
        }
        else
        {
            for(j=(max=i-n+1)+1;j<=i;++j)
            {
                if(data[j]>data[max])
                    max = j;
            }
        }

        result[i] = data[max];
    }

    return result;
}

HQIndexFormula.LLV=function(data,n)
{
    var result = [];
    if (n>data.length) return result;

    var min=-10000;

    for(i=n;i<data.length;++i,++j)
    {
        if(i<n+min) 
        {
            min=data[i]>data[min]?min:i;
        }
        else
        {
            for(j=(min=i-n+1)+1;j<=i;++j)
            {
                if(data[j]<data[min])
                    min = j;
            }
        }
        result[i] = data[min];
    }

    return result;
}

HQIndexFormula.REF=function(data,n)
{
    var result=[];

    if (data.length<=0) return result;
    if (n>=data.length) return result;

    result=data.slice(0,data.length-n);

    for(var i=0;i<n;++i)
        result.unshift(null);

    return result;
}

HQIndexFormula.SUM=function(data,n)
{
    var result=[];

    if (n==0)
    {
        result[0]=data[0];
           
        for (var i=1; i<data.length; ++i)
        {
            result[i] = result[i-1]+data[i];
        }
    }
    else
    {

        for(var i=n-1,j=0;i<data.length;++i,++j)
        {
            for(var k=0;k<n;++k)
            {
                if (k==0) result[i]=data[k+j];
                else result[i]+=data[k+j];
            }
        }
    }

    return result;
}

//两个数组相减
HQIndexFormula.ARRAY_SUBTRACT=function(data,data2)
{
    var result=[];
    var count=Math.max(data.length,data2.length)
    
    for(var i=0;i<count;++i)
    {
        if (i<data.length && i<data2.length)
            result[i]=data[i]-data2[i];
        else
            result[i]=null;
    }

    return result;
}

//数组 data>data2比较 返回 0/1 数组
HQIndexFormula.ARRAY_GT=function(data,data2)
{
    var result=[];
    var IsNumber=typeof(data2)=="number";
    if (IsNumber)
    {
        for(var i in data)
        {
            result[i]=(data[i]>data2 ? 1:0);
        }
    }
    else
    {
        var count=Math.max(data.length,data2.length)
        
        for(var i=0;i<count;++i)
        {
            if (i<data.length && i<data2.length)
                result[i]=data[i]>data2[i] ? 1:0;
            else
                result[i]=null;
        }
    }

    return result;
}

//数组 data==data2比较 返回 0/1 数组
HQIndexFormula.ARRAY_EQ=function(data,data2)
{
    var result=[];
    var IsNumber=typeof(data2)=="number";
    if (IsNumber)
    {
        for(var i in data)
        {
            result[i]=(data[i]==data2 ? 1:0);
        }
    }
    else
    {
        var count=Math.max(data.length,data2.length)
        
        for(var i=0;i<count;++i)
        {
            if (i<data.length && i<data2.length)
                result[i]=(data[i]==data2[i] ? 1:0);
            else
                result[i]=null;
        }
    }

    return result;
}

HQIndexFormula.ARRAY_IF=function(data,trueData,falseData)
{
    var result=[];
    var IsNumber=[typeof(trueData)=="number",typeof(falseData)=="number"];
    for(var i in data)
    {
        if (data[i])
        {
            if (IsNumber[0]) result[i]=trueData;
            else result[i]=trueData[i];
        }
        else 
        {
            if (IsNumber[1]) result[i]=falseData;
            else result[i]=falseData[i];
        }
    }

    return result;
}

HQIndexFormula.ARRAY_AND=function(data,data2)
{
    var result=[];
    var IsNumber=typeof(trueData)=="number";
    if (IsNumber)
    {
        for(var i in data)
        {
            result[i]=(data[i] && data2? 1:0);
        }
    }
    else
    {
        var count=Math.max(data.length,data2.length)
        
        for(var i=0;i<count;++i)
        {
            if (i<data.length && i<data2.length)
                result[i]=(data[i] && data2[i] ? 1:0);
            else
                result[i]=0;
        }
    }

    return result;
}

//数组相乘
HQIndexFormula.ARRAY_MULTIPLY=function(data,data2)
{
    var result=[];
    var IsNumber=typeof(data2)=="number";
    if (IsNumber)
    {
        for(var i in data)
        {
            result[i]=data[i]*data2;
        }
    }
    else
    {
        var count=Math.max(data.length,data2.length);
        for(var i=0;i<count;++i)
        {
            if (i<data.length && i<data2.length)
                result[i]=data[i]*data2[i];
            else
                result[i]=null;
        }
    }

    return result;
}

//数组相除
HQIndexFormula.ARRAY_DIVIDE=function(data,data2)
{
    var result=[];
    var IsNumber=typeof(data2)=="number";
    if (IsNumber)
    {
        for(var i in data)
        {
            result[i]=data[i]/data2;
        }
    }
    else
    {
        var count=Math.max(data.length,data2.length);
        for(var i=0;i<count;++i)
        {
            if (i<data.length && i<data2.length)
                result[i]=data[i]/data2[i];
            else
                result[i]=null;
        }
    }

    return result;
}

//数组相加
HQIndexFormula.ARRAY_ADD=function(data,data2)
{
    var result=[];
    var IsNumber=typeof(data2)=="number";
    if (IsNumber)
    {
        for(var i in data)
        {
            result[i]=data[i]+data2;
        }
    }
    else
    {
        var count=Math.max(data.length,data2.length);
        for(var i=0;i<count;++i)
        {
            if (i<data.length && i<data2.length)
                result[i]=data[i]+data2[i];
            else
                result[i]=null;
        }
    }

    return result;
}

HQIndexFormula.MAX=function(data,data2)
{
    var result=[];
    var IsNumber=typeof(data2)=="number";
    if (IsNumber)
    {
        for(var i in data)
        {
            result[i]=Math.max(data[i],data2);
        }
    }
    else
    {
        var count=Math.max(data.length,data2.length);
        for(var i=0;i<count;++i)
        {
            if (i<data.length && i<data2.length)
                result[i]=Math.max(data[i],data2[i]);
            else
                result[i]=null;
        }
    }

    return result;
}

HQIndexFormula.ABS=function(data)
{
    var result=[];
    for(var i in data)
    {
        result[i]=Math.abs(data[i]);
    }
   
    return result;
}


HQIndexFormula.MA=function(data,dayCount)
{
    var result=[];

    for (var i = 0, len = data.length; i < len; i++) 
    {
        if (i < dayCount) 
        {
            result[i]=null;
            continue;
        }

        var sum = 0;
        for (var j = 0; j < dayCount; j++) 
        {
            sum += data[i - j];
        }
        result[i]=sum / dayCount;
    }
    return result;
}

HQIndexFormula.STD=function(data,n)
{
    var result=[];

    var total=0;
    var averageData=[]; //平均值
    for(var i=n-1;i<data.length;++i)
    {
        total=0;
        for(var j=0;j<n;++j)
        {
            total+=data[i-j];
        }

        averageData[i]=total/n;
    }

    for(var i=n-1;i<data.length;++i)
    {
        total=0;
        for(var j=0;j<n;++j)
        {
            total+=Math.pow((data[i-j]-averageData[i]),2);
        }

        result[i]=Math.sqrt(total/n);
    }


    return result;
}

HQIndexFormula.COUNT=function(data,n)
{
    var result=[];

   
    for(var i=n-1;i<data.length;++i)
    {
        var count=0;
        for(var j=0;j<n;++j)
        {
            if (data[i-j]) ++count;
        }

        result[i]=count;
    }

    return result;
}

/////////////////////////////////////////////////////////////////////////////////////////////
//  K线图 控件
//  this.ChartPaint[0] K线画法 这个不要修改
//
//
function KLineChartContainer(uielement)
{
    this.newMethod=JSChartContainer;   //派生
    this.newMethod(uielement);
    delete this.newMethod;

    this.WindowIndex=new Array();
    this.Symbol;
    this.Name;
    this.Period=0;                      //周期 0 日线 1 周线 2 月线 3 年线
    this.Right=0;                       //复权 0 不复权 1 前复权 2 后复权
    this.SourceData;                    //原始的历史数据
    this.MaxReqeustDataCount=3000;      //数据个数

    this.KLineApiUrl="http://web4.umydata.com/API/KLine2";                      //历史K线api地址
    this.RealtimeApiUrl="http://web4.umydata.com/API/Stock";                    //实时行情api地址

    //创建 
    //windowCount 窗口个数
    this.Create=function(windowCount)
    {
        this.UIElement.JSChartContainer=this;

        //创建十字光标
        this.ChartCorssCursor=new ChartCorssCursor();
        this.ChartCorssCursor.Canvas=this.Canvas;
        this.ChartCorssCursor.StringFormatX=new HQDateStringFormat();
        this.ChartCorssCursor.StringFormatY=new HQPriceStringFormat();

        //创建框架容器
        this.Frame=new HQTradeFrame();
        this.Frame.ChartBorder=new ChartBorder();
        this.Frame.ChartBorder.UIElement=this.UIElement;
        this.Frame.ChartBorder.Top=25;
        this.Frame.ChartBorder.Left=5;
        this.Frame.Canvas=this.Canvas;
        this.ChartCorssCursor.Frame=this.Frame; //十字光标绑定框架

        this.CreateChildWindow(windowCount);
        this.CreateMainKLine();

        //子窗口动态标题
        for(var i in this.Frame.SubFrame)
        {
            titlePaint=new DynamicChartTitlePainting();
            titlePaint.Frame=this.Frame.SubFrame[i].Frame;
            titlePaint.Canvas=this.Canvas;

            this.TitlePaint.push(titlePaint);
        }

        this.UIElement.addEventListener("keydown", OnKeyDown, true);    //键盘消息
    }

    //创建子窗口
    this.CreateChildWindow=function(windowCount)
    {
        for(var i=0;i<windowCount;++i)
        {
            var border=new ChartBorder();
            border.UIElement=this.UIElement;

            var frame=new KLineFrame();
            frame.Canvas=this.Canvas;
            frame.ChartBorder=border;

            frame.HorizontalMax=20;
            frame.HorizontalMin=10;

            if (i==0) 
                frame.YSplitOperator=new FrameSplitKLinePriceY();
            else 
                frame.YSplitOperator=new FrameSplitY();

            frame.YSplitOperator.Frame=frame;
            frame.YSplitOperator.ChartBorder=border;
            frame.XSplitOperator=new FrameSplitKLineX();
            frame.XSplitOperator.Frame=frame;
            frame.XSplitOperator.ChartBorder=border;

            if (i!=windowCount-1) frame.XSplitOperator.ShowText=false;

            for(var j=frame.HorizontalMin;j<=frame.HorizontalMax;j+=1)
            {
                frame.HorizontalInfo[j]= new CoordinateInfo();
                frame.HorizontalInfo[j].Value=j;
                if (i==0 && j==frame.HorizontalMin) continue;

                frame.HorizontalInfo[j].Message[1]=j.toString();
                frame.HorizontalInfo[j].Font="14px 微软雅黑";
            }

            var subFrame=new SubFrameItem();
            subFrame.Frame=frame;
            if (i==0)
                subFrame.Height=20;
            else 
                subFrame.Height=10;

            this.Frame.SubFrame[i]=subFrame;
        }
    }

    //创建主图K线画法
    this.CreateMainKLine=function()
    {
        var kline=new ChartKLine();
        kline.Canvas=this.Canvas;
        kline.ChartBorder=this.Frame.SubFrame[0].Frame.ChartBorder;
        kline.ChartFrame=this.Frame.SubFrame[0].Frame;
        kline.Name="Main-KLine";

        this.ChartPaint[0]=kline;

        this.TitlePaint[0]=new DynamicKLineTitlePainting();
        this.TitlePaint[0].Frame=this.Frame.SubFrame[0].Frame;
        this.TitlePaint[0].Canvas=this.Canvas;

        //主图叠加画法
        var paint=new ChartOverlayKLine();
        paint.Canvas=this.Canvas;
        paint.ChartBorder=this.Frame.SubFrame[0].Frame.ChartBorder;
        paint.ChartFrame=this.Frame.SubFrame[0].Frame;
        paint.Name="Overlay-KLine";
        this.OverlayChartPaint[0]=paint;

    }

    //绑定主图K线数据
    this.BindMainData=function(hisData,showCount)
    {
        this.ChartPaint[0].Data=hisData;
        for(var i in this.Frame.SubFrame)
        {
            var item =this.Frame.SubFrame[i].Frame;
            item.XPointCount=showCount+5;
            item.Data=this.ChartPaint[0].Data;
        }

        this.TitlePaint[0].Data=this.ChartPaint[0].Data;                    //动态标题
        this.TitlePaint[0].Symbol=this.Symbol;
        this.TitlePaint[0].Name=this.Name;

        this.ChartCorssCursor.StringFormatX.Data=this.ChartPaint[0].Data;   //十字光标
        this.Frame.Data=this.ChartPaint[0].Data;

        this.OverlayChartPaint[0].MainData=this.ChartPaint[0].Data;         //K线叠加

        var dataOffset=hisData.Data.length-showCount;
        if (dataOffset<0) dataOffset=0;
        this.ChartPaint[0].Data.DataOffset=dataOffset;

        this.CursorIndex=showCount;
        if (this.CursorIndex+dataOffset>=hisData.Data.length) this.CursorIndex=dataOffset;
    }

    //创建指定窗口指标
    this.CreateWindowIndex=function(windowIndex)
    {
        this.WindowIndex[windowIndex].Create(this,windowIndex);
    }

    this.BindIndexData=function(windowIndex,hisData)
    {
        this.WindowIndex[windowIndex].BindData(this,windowIndex,hisData);
    }

    //获取子窗口的所有画法
    this.GetChartPaint=function(windowIndex)
    {
        var paint=new Array();
        for(var i in this.ChartPaint)
        {
            if (i==0) continue; //第1个K线数据除外

            var item=this.ChartPaint[i];
            if (item.ChartFrame==this.Frame.SubFrame[windowIndex].Frame)
                paint.push(item);
        }

        return paint;
    }

    this.RequestHistoryData=function(hqChart)
    {
        $.ajax({
            url: this.KLineApiUrl,
            data: 
            {
                "field": [
                    "name",
                    "symbol",
                    "yclose",
                    "open",
                    "price",
                    "high",
                    "low",
                    "vol"
                ],
                "symbol": this.Symbol,
                "start": -1,
                "count": this.MaxReqeustDataCount
            },
            type:"post",
            dataType: "json",
            async:true,
            success: function (data) 
            {
                hqChart.RecvHistroyData(data);
            }
        });
        
    }

    this.RecvHistroyData=function(data)
    {
        var aryDayData=KLineChartContainer.JsonDataToHistoryData(data);

        //原始数据
        var sourceData=new ChartData();
        sourceData.Data=aryDayData;

        //显示的数据
        var bindData=new ChartData();
        bindData.Data=aryDayData;
        bindData.Right=this.Right;
        bindData.Period=this.Period;

        if (bindData.Right>0)    //复权
        {
            var rightData=bindData.GetRightDate(bindData.Right);
            bindData.Data=rightData;
        }

        if (bindData.Period>0)   //周期数据
        {
            var periodData=sourceData.GetPeriodData(bindData.Period);
            bindData.Data=periodData;
        }
       
        //绑定数据
        this.SourceData=sourceData;
        this.Symbol=data.symbol;
        this.Name=data.name;
        this.BindMainData(bindData,200);

        for(var i=0; i<this.Frame.SubFrame.length; ++i)
        {
            this.BindIndexData(i,bindData);
        }
        //this.BindIndexData(0,hisData);
        //this.BindIndexData(1,hisData);
        //this.BindIndexData(2,hisData);

        //刷新画图
        this.UpdataDataoffset();           //更新数据偏移
        this.UpdatePointByCursorIndex();   //更新十字光标位子
        this.UpdateFrameMaxMin();          //调整坐标最大 最小值
        this.Frame.SetSizeChage(true);
        this.Draw();  
    }

    //请求实时行情数据
    this.ReqeustRealtimeData=function(hqChart)
    {
        $.ajax({
            url: this.RealtimeApiUrl,
            data: 
            {
                "field": [
                    "name",
                    "symbol",
                    "yclose",
                    "open",
                    "price",
                    "high",
                    "low",
                    "vol",
                    "amount",
                    "date",
                    "time"
                ],
                "symbol": [this.Symbol],
                "start": -1
            },
            type:"post",
            dataType: "json",
            async:true,
            success: function (data) 
            {
                hqChart.RecvRealtimeData(data);
            }
        });
    }

    this.RecvRealtimeData=function(data)
    {
        var realtimeData=KLineChartContainer.JsonDataToRealtimeData(data);
        if (this.Symbol==data.symbol)
        {
            if (this.SourceData.Data[this.SourceData.Data.length-1].Date==realtimeData.Date)    //实时行情数据更新
            {
                var item =this.SourceData.Data[this.SourceData.Data.length-1];
                item.Close=realtimeData.Close;
                item.High=realtimeData.High;
                item.Low=realtimeData.Low;
                item.Vol=realtimeData.Vol;
                item.Amount=realtimeData.Amount;
            }
        }
    }

    //周期切换
    this.ChangePeriod=function(period)
    {
        if (period<0 || period>3) return; //0 日线 1=周 2=月 3=年

        if (this.Period==period) return;

        this.Period=period;

        this.Updata();
    }

    //复权切换
    this.ChangeRight=function(right)
    {
        if (IsIndexSymbol(this.Symbol)) return; //指数没有复权

        if (right<0 || right>2) return;

        if (this.Right==right) return;

        this.Right=right;

        this.Updata();
    }

    //切换指标 指定切换窗口指标
    this.ChangeIndex=function(windowIndex,indexName)
    {
        //主图指标
        if(indexName=="均线" || indexName=="BOLL") windowIndex=0;

        var paint=new Array();  //踢出当前窗口的指标画法
        for(var i in this.ChartPaint)
        {
            var item=this.ChartPaint[i];

            if (i==0 || item.ChartFrame!=this.Frame.SubFrame[windowIndex].Frame)
                paint.push(item);
        }

        this.ChartPaint=paint;

        //清空东条标题
        var titleIndex=windowIndex+1;
        this.TitlePaint[titleIndex].Data=[];
        this.TitlePaint[titleIndex].Title=null;

        switch(indexName)
        {
            //主图指标
            case "均线":
                this.WindowIndex[windowIndex]=new CloseMAIndex();
                break;
            case "BOLL":
                this.WindowIndex[windowIndex]=new BOLLIndex();
                break;

            //子图指标
            case "MACD":
                this.WindowIndex[windowIndex]=new MACDIndex();
                break;
            case "KDJ":
                this.WindowIndex[windowIndex]=new KDJIndex();
                break;
            case "VOL":
                this.WindowIndex[windowIndex]=new VolumeIndex();
                break;
            case "RSI":
                this.WindowIndex[windowIndex]=new RSIIndex();
                break;
            case "BRAR":
                this.WindowIndex[windowIndex]=new BRARIndex();
                break;
            case "WR":
                this.WindowIndex[windowIndex]=new WRIndex();
                break;
            case "BIAS":
                this.WindowIndex[windowIndex]=new BIASIndex();
                break;
            case "OBV":
                this.WindowIndex[windowIndex]=new OBVIndex();
                break;
            case "DMI":
                this.WindowIndex[windowIndex]=new DMIIndex();
                break;
            case "CR":
                this.WindowIndex[windowIndex]=new CRIndex();
                break;
            case "PSY":
                this.WindowIndex[windowIndex]=new PSYIndex();
                break;
            default:
                this.Draw();
                return;
        }

        
        this.CreateWindowIndex(windowIndex);

        var bindData=this.ChartPaint[0].Data;
        this.BindIndexData(windowIndex,bindData);

        this.UpdataDataoffset();           //更新数据偏移
        this.UpdateFrameMaxMin();          //调整坐标最大 最小值
        this.Draw();
    }

    this.Updata=function()
    {
        if (!this.SourceData) return;

        var bindData=new ChartData();
        bindData.Data=this.SourceData.Data;
        bindData.Period=this.Period;
        bindData.Right=this.Right;

        if (bindData.Right>0)    //复权
        {
            var rightData=bindData.GetRightDate(bindData.Right);
            bindData.Data=rightData;
        }

        if (bindData.Period>0)   //周期数据
        {
            var periodData=bindData.GetPeriodData(bindData.Period);
            bindData.Data=periodData;
        }
        
        //绑定数据
        this.BindMainData(bindData,200);

        for(var i=0; i<this.Frame.SubFrame.length; ++i)
        {
            this.BindIndexData(i,bindData);
        }

        //叠加数据周期调整
        if (this.OverlayChartPaint[0].SourceData)
        {
            var bindData=new ChartData();
            bindData.Data=this.OverlayChartPaint[0].SourceData.Data;
            bindData.Period=this.Period;
            bindData.Right=this.Right;

            if (bindData.Right>0 && !IsIndexSymbol(this.OverlayChartPaint[0].Symbol))       //复权数据
            {
                var rightData=bindData.GetRightDate(bindData.Right);
                bindData.Data=rightData;
            }

            var aryOverlayData=this.SourceData.GetOverlayData(bindData.Data);      //和主图数据拟合以后的数据
            bindData.Data=aryOverlayData;

            if (bindData.Period>0)   //周期数据
            {
                var periodData=bindData.GetPeriodData(bindData.Period);
                bindData.Data=periodData;
            }

            this.OverlayChartPaint[0].Data=bindData;
        }

        //刷新画图
        this.UpdataDataoffset();           //更新数据偏移
        this.UpdatePointByCursorIndex();   //更新十字光标位子
        this.UpdateFrameMaxMin();          //调整坐标最大 最小值
        this.Frame.SetSizeChage(true);
        this.Draw();  
    }

    //切换股票代码
    this.ChangeSymbol=function(symbol)
    {
        this.Symbol=symbol;
        if (IsIndexSymbol(symbol)) this.Right=0;  //指数没有复权
        this.RequestHistoryData(this);            //请求数据
    }

    //叠加股票
    this.OverlaySymbol=function(symbol,hqChart)
    {
        if (!this.OverlayChartPaint[0].MainData) return false;

        this.OverlayChartPaint[0].Symbol=symbol;
       
        //请求数据
        $.ajax({
            url: this.KLineApiUrl,
            data: 
            {
                "field": [
                    "name",
                    "symbol",
                    "yclose",
                    "open",
                    "price",
                    "high"
                ],
                "symbol": symbol,
                "start": -1,
                "count": this.MaxReqeustDataCount
            },
            type:"post",
            dataType: "json",
            async:true,
            success: function (data) 
            {
                hqChart.RecvOverlayHistoryData(data);
            }
        });

        return true;
    }

    this.RecvOverlayHistoryData=function(data)
    {
        var aryDayData=KLineChartContainer.JsonDataToHistoryData(data);

        //原始叠加数据
        var sourceData=new ChartData();
        sourceData.Data=aryDayData;

        var bindData=new ChartData();
        bindData.Data=aryDayData;
        bindData.Period=this.Period;
        bindData.Right=this.Right;

        if (bindData.Right>0 && !IsIndexSymbol(data.symbol))    //复权数据 ,指数没有复权)       
        {
            var rightData=bindData.GetRightDate(bindData.Right);
            bindData.Data=rightData;
        }

        var aryOverlayData=this.SourceData.GetOverlayData(bindData.Data);      //和主图数据拟合以后的数据
        bindData.Data=aryOverlayData;
        
        if (bindData.Period>0)   //周期数据
        {
            var periodData=bindData.GetPeriodData(bindData.Period);
            bindData.Data=periodData;
        }

        this.OverlayChartPaint[0].Data=bindData;
        this.OverlayChartPaint[0].SourceData=sourceData;
        this.OverlayChartPaint[0].Title=data.name;
        this.OverlayChartPaint[0].Symbol=data.symbol;

        this.UpdataDataoffset();           //更新数据偏移
        this.UpdateFrameMaxMin();          //调整坐标最大 最小值
        this.Frame.SetSizeChage(true);
        this.Draw(); 
        
    }

    //取消叠加股票
    this.ClearOverlaySymbol=function()
    {
        this.OverlayChartPaint[0].Symbol=null;
        this.OverlayChartPaint[0].Data=null;
        this.OverlayChartPaint[0].SourceData=null;
        this.OverlayChartPaint[0].TooltipRect=[];
    }
}

//API 返回数据 转化为array[]
KLineChartContainer.JsonDataToHistoryData=function(data)
{
    var list = data.data;
    var aryDayData=new Array();
    var date = 0, yclose = 1, open = 2, high = 3, low = 4, close = 5, vol = 6, amount = 7;
    for (var i = 0; i < list.length; ++i) 
    {
        var item = new HistoryData();

        item.Date = list[i][date];
        item.Open = list[i][open];
        item.YClose = list[i][yclose];
        item.Close = list[i][close];
        item.High = list[i][high];
        item.Low = list[i][low];
        item.Vol = list[i][vol];
        item.Amount = list[i][amount];

        aryDayData[i] = item;
    }

    return aryDayData;
}

KLineChartContainer.JsonDataToRealtimeData=function(data)
{
    var item=new HistoryData();
    item.Date=data.stock[0].date;
    item.Open=data.stock[0].open;
    item.YClose=data.stock[0].yclose;
    item.High=data.stock[0].high;
    item.Low=data.stock[0].low;
    item.Vol=data.stock[0].vol;
    item.Amount=data.stock[0].amount;
}


///////////////////////////////////////////////////////////////////////////////////////////
//  走势图
//
function MinuteChartContainer(uielement)
{
    this.newMethod=JSChartContainer;   //派生
    this.newMethod(uielement);
    delete this.newMethod;

    this.WindowIndex=new Array();
    this.Symbol;
    this.Name;
    this.SourceData;                          //原始的历史数据
    this.IsAutoUpate=false;                   //是否自动更新行情数据
    this.TradeDate=0;                             //行情交易日期

    this.MinuteApiUrl="http://web4.umydata.com/API/Stock";

    //创建 
    //windowCount 窗口个数
    this.Create=function(windowCount)
    {
        this.UIElement.JSChartContainer=this;

        //创建十字光标
        this.ChartCorssCursor=new ChartCorssCursor();
        this.ChartCorssCursor.Canvas=this.Canvas;
        this.ChartCorssCursor.StringFormatX=new HQMinuteTimeStringFormat();
        this.ChartCorssCursor.StringFormatY=new HQPriceStringFormat();

        //创建框架容器
        this.Frame=new HQTradeFrame();
        this.Frame.ChartBorder=new ChartBorder();
        this.Frame.ChartBorder.UIElement=this.UIElement;
        this.Frame.ChartBorder.Top=25;
        this.Frame.ChartBorder.Left=50;
        this.Frame.Canvas=this.Canvas;
        this.ChartCorssCursor.Frame=this.Frame; //十字光标绑定框架

        this.CreateChildWindow(windowCount);
        this.CreateMainKLine();

        //子窗口动态标题
        for(var i in this.Frame.SubFrame)
        {
            titlePaint=new DynamicChartTitlePainting();
            titlePaint.Frame=this.Frame.SubFrame[i].Frame;
            titlePaint.Canvas=this.Canvas;

            this.TitlePaint.push(titlePaint);
        }

        this.UIElement.addEventListener("keydown", OnKeyDown, true);    //键盘消息
    }

    //创建子窗口
    this.CreateChildWindow=function(windowCount)
    {
        for(var i=0;i<windowCount;++i)
        {
            var border=new ChartBorder();
            border.UIElement=this.UIElement;

            var frame=new MinuteFrame();
            frame.Canvas=this.Canvas;
            frame.ChartBorder=border;
            if (i<2) frame.ChartBorder.TitleHeight=0;
            frame.XPointCount=243;

            var DEFAULT_HORIZONTAL=[9,8,7,6,5,4,3,2,1];
            frame.HorizontalMax=DEFAULT_HORIZONTAL[0];
            frame.HorizontalMin=DEFAULT_HORIZONTAL[DEFAULT_HORIZONTAL.length-1];

            if (i==0) 
                frame.YSplitOperator=new FrameSplitMinutePriceY();
            else 
                frame.YSplitOperator=new FrameSplitY();

            frame.YSplitOperator.Frame=frame;
            frame.YSplitOperator.ChartBorder=border;
            frame.XSplitOperator=new FrameSplitMinuteX();
            frame.XSplitOperator.Frame=frame;
            frame.XSplitOperator.ChartBorder=border;
            if (i!=windowCount-1) frame.XSplitOperator.ShowText=false;
            frame.XSplitOperator.Operator();

            for(var j in DEFAULT_HORIZONTAL)
            {
                frame.HorizontalInfo[j]= new CoordinateInfo();
                frame.HorizontalInfo[j].Value=DEFAULT_HORIZONTAL[j];
                if (i==0 && j==frame.HorizontalMin) continue;

                frame.HorizontalInfo[j].Message[1]=DEFAULT_HORIZONTAL[j].toString();
                frame.HorizontalInfo[j].Font="14px 微软雅黑";
            }

            var subFrame=new SubFrameItem();
            subFrame.Frame=frame;
            if (i==0)
                subFrame.Height=20;
            else 
                subFrame.Height=10;

            this.Frame.SubFrame[i]=subFrame;
        }
    }

    this.CreateStockInfo=function()
    {
        this.ExtendChartPaint[0]=new StockInfoExtendChartPaint();
        this.ExtendChartPaint[0].Canvas=this.Canvas;
        this.ExtendChartPaint[0].ChartBorder=this.Frame.ChartBorder;
        this.ExtendChartPaint[0].ChartFrame=this.Frame;

        this.Frame.ChartBorder.Right=300;
    }

    //创建主图K线画法
    this.CreateMainKLine=function()
    {
        //分钟线
        var minuteLine=new ChartMinutePriceLine();
        minuteLine.Canvas=this.Canvas;
        minuteLine.ChartBorder=this.Frame.SubFrame[0].Frame.ChartBorder;
        minuteLine.ChartFrame=this.Frame.SubFrame[0].Frame;
        minuteLine.Name="Minute-Line";
        minuteLine.Color=g_JSChartResource.Minute.PriceColor;

        this.ChartPaint[0]=minuteLine;

        //分钟线均线
        var averageLine=new ChartLine();
        averageLine.Canvas=this.Canvas;
        averageLine.ChartBorder=this.Frame.SubFrame[0].Frame.ChartBorder;
        averageLine.ChartFrame=this.Frame.SubFrame[0].Frame;
        averageLine.Name="Minute-Average-Line";
        averageLine.Color=g_JSChartResource.Minute.AvPriceColor;
        this.ChartPaint[1]=averageLine;

        var averageLine=new ChartMinuteVolumBar();
        averageLine.Color=g_JSChartResource.Minute.VolBarColor;
        averageLine.Canvas=this.Canvas;
        averageLine.ChartBorder=this.Frame.SubFrame[1].Frame.ChartBorder;
        averageLine.ChartFrame=this.Frame.SubFrame[1].Frame;
        averageLine.Name="Minute-Vol-Bar";
        this.ChartPaint[2]=averageLine;

        
        this.TitlePaint[0]=new DynamicMinuteTitlePainting();
        this.TitlePaint[0].Frame=this.Frame.SubFrame[0].Frame;
        this.TitlePaint[0].Canvas=this.Canvas;

        /*
        //主图叠加画法
        var paint=new ChartOverlayKLine();
        paint.Canvas=this.Canvas;
        paint.ChartBorder=this.Frame.SubFrame[0].Frame.ChartBorder;
        paint.ChartFrame=this.Frame.SubFrame[0].Frame;
        paint.Name="Overlay-KLine";
        this.OverlayChartPaint[0]=paint;
        */

    }

    //切换股票代码
    this.ChangeSymbol=function(symbol)
    {
        this.Symbol=symbol;
        this.RequestMinuteData();               //请求数据
    }


    //请求分钟数据
    this.RequestMinuteData=function()
    {
        var _self=this;

        $.ajax({
            url: _self.MinuteApiUrl,
            data: 
            {
                "field": [
                    "name",
                    "symbol",
                    "yclose",
                    "open",
                    "price",
                    "high",
                    "low",
                    "vol",
                    "amount",
                    "date",
                    "minute",
                    "time"
                ],
                "symbol": [_self.Symbol],
                "start": -1
            },
            type:"post",
            dataType: "json",
            async:true,
            success: function (data) 
            {
                _self.RecvMinuteData(data);
            }
        });
    }

    this.RecvMinuteData=function(data)
    {
        var aryMinuteData=MinuteChartContainer.JsonDataToMinuteData(data);

        //原始数据
        var sourceData=new ChartData();
        sourceData.Data=aryMinuteData;

        this.TradeDate=data.stock[0].date;

        this.SourceData=sourceData;
        this.Symbol=data.stock[0].symbol;
        this.Name=data.stock[0].name;

        this.BindMainData(sourceData,data.stock[0].yclose);

        this.UpdateFrameMaxMin();          //调整坐标最大 最小值
        this.Frame.SetSizeChage(true);
        this.Draw(); 

        this.AutoUpdata();
    }

    //数据自动更新
    this.AutoUpdata=function()
    {
        var _self = this;

        if (!this.IsAutoUpate) return; 

        //9:30 - 15:40 非周6，日 每隔30秒更新一次 this.RequestMinuteData();
        var nowDate= new Date(),
            day = nowDate.getDay(),
            time = nowDate.getHours() * 100 + nowDate.getMinutes();
        
        if(day == 6 || day== 0) return ;

        if(time>1540) return ;

        if(time <930){
            setTimeout(function(){
                _self.AutoUpdata();
            },30000);
        }else{
            setTimeout(function(){
                _self.RequestMinuteData();
            },30000);
        }
    }

    //绑定分钟数据
    this.BindMainData=function(minuteData,yClose)
    {
        //分钟数据
        var bindData=new ChartData();
        bindData.Data=minuteData.GetMinutePrice();
        this.ChartPaint[0].Data=bindData;
        this.ChartPaint[0].YClose=yClose;

        this.Frame.SubFrame[0].Frame.YSplitOperator.YClose=yClose;
        this.Frame.SubFrame[0].Frame.YSplitOperator.Data=bindData;

        //均线
        bindData=new ChartData();
        bindData.Data=minuteData.GetMinuteAvPrice();
        this.ChartPaint[1].Data=bindData;

        //成交量
        bindData=new ChartData();
        bindData.Data=minuteData.GetMinuteVol();
        this.ChartPaint[2].Data=bindData;
       
        this.TitlePaint[0].Data=this.SourceData;                    //动态标题
        this.TitlePaint[0].Symbol=this.Symbol;
        this.TitlePaint[0].Name=this.Name;
        this.TitlePaint[0].YClose=yClose;

        if (this.ExtendChartPaint[0])
        {
            this.ExtendChartPaint[0].Symbol=this.Symbol;
            this.ExtendChartPaint[0].Name=this.Name;
        }

        /*
        this.ChartCorssCursor.StringFormatX.Data=this.ChartPaint[0].Data;   //十字光标
        this.Frame.Data=this.ChartPaint[0].Data;

        this.OverlayChartPaint[0].MainData=this.ChartPaint[0].Data;         //K线叠加

        var dataOffset=hisData.Data.length-showCount;
        if (dataOffset<0) dataOffset=0;
        this.ChartPaint[0].Data.DataOffset=dataOffset;

        this.CursorIndex=showCount;
        if (this.CursorIndex+dataOffset>=hisData.Data.length) this.CursorIndex=dataOffset;
        */
    }
}

//API 返回数据 转化为array[]
MinuteChartContainer.JsonDataToMinuteData=function(data)
{
    var aryMinuteData=new Array();
    for(var i in data.stock[0].minute)
    {
        var jsData=data.stock[0].minute[i];
        var item=new MinuteData();

        item.Price=jsData.price;
        item.Open=jsData.open;
        item.High=jsData.high;
        item.Low=jsData.low;
        item.Vol=jsData.vol;
        item.Amount=jsData.amount;
        item.DateTime=data.stock[0].date.toString()+" "+jsData.time.toString();
        item.Increate=jsData.increate;
        item.Risefall=jsData.risefall;
        item.AvPrice=jsData.avprice;

        aryMinuteData[i]=item;
    }

    return aryMinuteData;
}



//////////////////////////////////////////////////////////
//
//  指标信息
//
function IndexInfo(name,param)
{
    this.Name=name;                 //名字
    this.Param=param;               //参数
    this.LineColor;                 //线段颜色
}

function BaseIndex(name)
{
    this.Index; //指标阐述
    this.Name=name;  //指标名字

    //默认创建都是线段
    this.Create=function(hqChart,windowIndex)
    {
        for(var i in this.Index)
        {
            var maLine=new ChartLine();
            maLine.Canvas=hqChart.Canvas;
            maLine.Name=this.Name+'-'+i.toString();
            maLine.ChartBorder=hqChart.Frame.SubFrame[windowIndex].Frame.ChartBorder;
            maLine.ChartFrame=hqChart.Frame.SubFrame[windowIndex].Frame;
            maLine.Color=this.Index[i].LineColor;

            hqChart.ChartPaint.push(maLine);
        }
    }
}

//////////////////////////////////////////////////////////////////////////////////////
//  MA(5,10,20)
//
//
function CloseMAIndex()
{
    this.newMethod=BaseIndex;   //派生
    this.newMethod('MALine');
    delete this.newMethod;

    this.Index=new Array(
        new IndexInfo("MA",5),
        new IndexInfo("MA",10),
        new IndexInfo("MA",20),
    );

    this.Index[0].LineColor="rgb(255,130,71)";
    this.Index[1].LineColor="rgb(218,112,214)";
    this.Index[2].LineColor="rgb(255,52,179)";

    this.BindData=function(hqChart,windowIndex,hisData)
    {
        var paint=hqChart.GetChartPaint(windowIndex);

        if (paint.length!=this.Index.length) return false;

        var titleIndex=windowIndex+1;

        for(var i in paint)
        {
            var maData=hisData.GetCloseMA(this.Index[i].Param);
            paint[i].Data.Data=maData;
            hqChart.TitlePaint[titleIndex].Data[i]=new DynamicTitleData(paint[i].Data,this.Index[i].Name,this.Index[i].LineColor);
        }

        return true;
    }
}

///////////////////////////////////////////////////////////////////////////////////////////
//  成交量指标 VOL(5,10)
//
function VolumeIndex()
{
    this.newMethod=BaseIndex;   //派生
    this.newMethod('VOL');
    delete this.newMethod;

    this.Index=new Array(
        new IndexInfo("VOL",0),
        new IndexInfo("VOLMA",5),
        new IndexInfo("VOLMA",10),
    );

    this.Index[0].LineColor=g_JSChartResource.DefaultTextColor;
    this.Index[1].LineColor="rgb(218,112,214)";
    this.Index[2].LineColor="rgb(255,52,179)";

    this.Create=function(hqChart,windowIndex)
    {
        for(var i in this.Index)
        {
            var paint=null;
            if (i==0)
            {
                paint=new ChartKVolumeBar();
            }
            else
            {
                paint=new ChartLine();
                paint.Color=this.Index[i].LineColor;
            }

            paint.Canvas=hqChart.Canvas;
            paint.Name=this.Name+'-'+i.toString();
            paint.ChartBorder=hqChart.Frame.SubFrame[windowIndex].Frame.ChartBorder;
            paint.ChartFrame=hqChart.Frame.SubFrame[windowIndex].Frame;
            
            hqChart.ChartPaint.push(paint);
        }
    }

    this.BindData=function(hqChart,windowIndex,hisData)
    {
        var paint=hqChart.GetChartPaint(windowIndex);

        if (paint.length!=this.Index.length) return false;

        paint[0].Data=hisData;
        paint[1].Data.Data=hisData.GetVolMA(this.Index[1].Param);
        paint[2].Data.Data=hisData.GetVolMA(this.Index[2].Param);

        var titleIndex=windowIndex+1;
        for(var i in paint)
        {
            hqChart.TitlePaint[titleIndex].Data[i]=new DynamicTitleData(paint[i].Data,this.Index[i].Name,this.Index[i].LineColor);
            if(i==0) hqChart.TitlePaint[titleIndex].Data[i].DataType="HistoryData-Vol";
        }

        hqChart.TitlePaint[titleIndex].Title="VOL("+this.Index[1].Param+","+this.Index[2].Param+")";

        return true;
    }
}


////////////////////////////////////////////////////////////////////////////////////////////////////
//  MACD
//
function MACDIndex()
{
    this.newMethod=BaseIndex;   //派生
    this.newMethod('MACD');
    delete this.newMethod;

    this.Index=new Array(
        new IndexInfo("DIF",12),
        new IndexInfo("DEA",26),
        new IndexInfo("MACD",9),
    );

    this.Index[0].LineColor="rgb(218,112,214)";
    this.Index[1].LineColor="rgb(255,52,179)";
    this.Index[2].LineColor=g_JSChartResource.DefaultTextColor;

    this.Create=function(hqChart,windowIndex)
    {
        for(var i in this.Index)
        {
            var paint=null;
            if (i==2)
            {
                paint=new ChartMACD();
            }
            else
            {
                paint=new ChartLine();
                paint.Color=this.Index[i].LineColor;
            }

            paint.Canvas=hqChart.Canvas;
            paint.Name=this.Name+"-"+i.toString();
            paint.ChartBorder=hqChart.Frame.SubFrame[windowIndex].Frame.ChartBorder;
            paint.ChartFrame=hqChart.Frame.SubFrame[windowIndex].Frame;
            
            hqChart.ChartPaint.push(paint);
        }
    }

    this.BindData=function(hqChart,windowIndex,hisData)
    {
        var paint=hqChart.GetChartPaint(windowIndex);

        if (paint.length!=this.Index.length) return false;

        var closeData=hisData.GetClose();
        var closeEMA12=HQIndexFormula.EMA(closeData,this.Index[0].Param);
        var closeEMA26=HQIndexFormula.EMA(closeData,this.Index[1].Param);

        var data1=[];
        for(var i in closeEMA12)
        {
            data1[i]=closeEMA12[i]-closeEMA26[i];
        }

        var data2=HQIndexFormula.EMA(data1,this.Index[2].Param);

        var data3=[];
        for(var i in data1)
        {
            data3[i]=(data1[i]-data2[i])*2;
        }

        paint[0].Data.Data=data1;
        paint[1].Data.Data=data2;
        paint[2].Data.Data=data3;

        var titleIndex=windowIndex+1;
        for(var i in paint)
        {
            hqChart.TitlePaint[titleIndex].Data[i]=new DynamicTitleData(paint[i].Data,this.Index[i].Name,this.Index[i].LineColor);
        }

        hqChart.TitlePaint[titleIndex].Title="MACD("+this.Index[0].Param+","+this.Index[1].Param+","+this.Index[2].Param+")";

        return true;
    }
}


/*
  KDJ
        RSV:=(CLOSE-LLV(LOW,N))/(HHV(HIGH,N)-LLV(LOW,N))*100;
        K:SMA(RSV,M1,1);
        D:SMA(K,M2,1);
        J:3*K-2*D;  
*/
function KDJIndex()
{
    this.newMethod=BaseIndex;   //派生
    this.newMethod('KDJ');
    delete this.newMethod;

    this.Index=new Array(
        new IndexInfo("K",9),
        new IndexInfo("D",3),
        new IndexInfo("J",3),
    );

    this.Index[0].LineColor="rgb(255,130,71)";
    this.Index[1].LineColor="rgb(218,112,214)";
    this.Index[2].LineColor="rgb(255,52,179)";

    this.BindData=function(hqChart,windowIndex,hisData)
    {
        var paint=hqChart.GetChartPaint(windowIndex);

        if (paint.length!=this.Index.length) return false;

        var closeData=hisData.GetClose();
        var highData=hisData.GetHigh();
        var lowData=hisData.GetLow();

        var hhvData=HQIndexFormula.HHV(highData,this.Index[0].Param);
        var llvData=HQIndexFormula.LLV(lowData,this.Index[0].Param);

        var rsvData=[];
        for(var i in closeData)
        {
            rsvData[i]=(closeData[i]-llvData[i])/(hhvData[i]-llvData[i])*100;
        }

        var kData=HQIndexFormula.SMA(rsvData,this.Index[1].Param,1);
        var dData=HQIndexFormula.SMA(kData,this.Index[2].Param,1);
        var jData=[];
        for(var i in kData)
        {
            jData[i]=3*kData[i]-2*dData[i];
        }

        paint[0].Data.Data=kData;
        paint[1].Data.Data=dData;
        paint[2].Data.Data=jData;

        var titleIndex=windowIndex+1;

        for(var i in paint)
        {
            hqChart.TitlePaint[titleIndex].Data[i]=new DynamicTitleData(paint[i].Data,this.Index[i].Name,this.Index[i].LineColor);
        }

        hqChart.TitlePaint[titleIndex].Title="KDJ("+this.Index[0].Param+","+this.Index[1].Param+","+this.Index[2].Param+")";
        return true;
    }
}

/*
    RSI
    LC:=REF(CLOSE,1);
    RSI1:SMA(MAX(CLOSE-LC,0),N1,1)/SMA(ABS(CLOSE-LC),N1,1)*100;
    RSI2:SMA(MAX(CLOSE-LC,0),N2,1)/SMA(ABS(CLOSE-LC),N2,1)*100;
    RSI3:SMA(MAX(CLOSE-LC,0),N3,1)/SMA(ABS(CLOSE-LC),N3,1)*100;
*/

function RSIIndex()
{
    this.newMethod=BaseIndex;   //派生
    this.newMethod('RSI');
    delete this.newMethod;

    this.Index=new Array(
        new IndexInfo("RSI1",6),
        new IndexInfo("RSI2",12),
        new IndexInfo("RSI3",24),
    );

    this.Index[0].LineColor="rgb(255,130,71)";
    this.Index[1].LineColor="rgb(218,112,214)";
    this.Index[2].LineColor="rgb(255,52,179)";

    this.BindData=function(hqChart,windowIndex,hisData)
    {
        var paint=hqChart.GetChartPaint(windowIndex);

        if (paint.length!=this.Index.length) return false;

        var closeData=hisData.GetClose();
        var closeData2=HQIndexFormula.REF(closeData,1);
        var closeMax=HQIndexFormula.MAX(HQIndexFormula.ARRAY_SUBTRACT(closeData,closeData2),0);
        var closeAbs=HQIndexFormula.ABS(HQIndexFormula.ARRAY_SUBTRACT(closeData,closeData2));

        for(var i in paint)
        {
            var data1=HQIndexFormula.SMA(closeMax,this.Index[i].Param,1);
            var data2=HQIndexFormula.SMA(closeAbs,this.Index[i].Param,1);
            var data=[];
            for(var j in data1)
            {
                data[j]=data1[j]/data2[j]*100;
            }
            paint[i].Data.Data=data;
        }

        //设置动态标题
        var titleIndex=windowIndex+1;

        for(var i in paint)
        {
            hqChart.TitlePaint[titleIndex].Data[i]=new DynamicTitleData(paint[i].Data,this.Index[i].Name,this.Index[i].LineColor);
        }

        hqChart.TitlePaint[titleIndex].Title="RSI("+this.Index[0].Param+","+this.Index[1].Param+","+this.Index[2].Param+")";

        return true;
    }
}


/*
    BRAR 情绪指标
    BR:SUM(MAX(0,HIGH-REF(CLOSE,1)),N)/SUM(MAX(0,REF(CLOSE,1)-LOW),N)*100;
    AR:SUM(HIGH-OPEN,N)/SUM(OPEN-LOW,N)*100;
*/
function BRARIndex()
{
    this.newMethod=BaseIndex;   //派生
    this.newMethod('BRAR');
    delete this.newMethod;

    this.Index=new Array(
        new IndexInfo("BR",26),
        new IndexInfo("AR",null),
    );

    this.Index[0].LineColor="rgb(255,130,71)";
    this.Index[1].LineColor="rgb(218,112,214)";


    this.BindData=function(hqChart,windowIndex,hisData)
    {
        var paint=hqChart.GetChartPaint(windowIndex);

        if (paint.length!=this.Index.length) return false;

        var closeData=hisData.GetClose();
        var close1Data=HQIndexFormula.REF(closeData,1);
        var highData=hisData.GetHigh();
        var lowData=hisData.GetLow();
        var openData=hisData.GetOpen();

        //BR:SUM(MAX(0,HIGH-REF(CLOSE,1)),N)/SUM(MAX(0,REF(CLOSE,1)-LOW),N)*100;
        var tempData=HQIndexFormula.SUM(HQIndexFormula.MAX(HQIndexFormula.ARRAY_SUBTRACT(highData,close1Data),0),this.Index[0].Param);
        var tempData2=HQIndexFormula.SUM(HQIndexFormula.MAX(HQIndexFormula.ARRAY_SUBTRACT(close1Data,lowData),0),this.Index[0].Param);
        var tempData3=[];
        for(var i in tempData2)
        {
            tempData3[i]=tempData[i]/tempData2[i]*100;
        }

        paint[0].Data.Data=tempData3;

        //SUM(HIGH-OPEN,N)/SUM(OPEN-LOW,N)*100;
        tempData=HQIndexFormula.SUM(HQIndexFormula.ARRAY_SUBTRACT(highData,openData),this.Index[0].Param);
        tempData2=HQIndexFormula.SUM(HQIndexFormula.ARRAY_SUBTRACT(openData,lowData),this.Index[0].Param);
        tempData3=[];
        for(var i in tempData2)
        {
            tempData3[i]=tempData[i]/tempData2[i]*100;
        }
        paint[1].Data.Data=tempData3;
        

        var titleIndex=windowIndex+1;

        for(var i in paint)
        {
            hqChart.TitlePaint[titleIndex].Data[i]=new DynamicTitleData(paint[i].Data,this.Index[i].Name,this.Index[i].LineColor);
        }

        hqChart.TitlePaint[titleIndex].Title="BRAR("+this.Index[0].Param+")";
        return true;
    }
}

/*
    WR 威廉指标
    WR1:100*(HHV(HIGH,N)-CLOSE)/(HHV(HIGH,N)-LLV(LOW,N));
    WR2:100*(HHV(HIGH,N1)-CLOSE)/(HHV(HIGH,N1)-LLV(LOW,N1));
*/
function WRIndex()
{
    this.newMethod=BaseIndex;   //派生
    this.newMethod('WR');
    delete this.newMethod;

    this.Index=new Array(
        new IndexInfo("WR1",10),
        new IndexInfo("WR2",6),
    );

    this.Index[0].LineColor="rgb(255,130,71)";
    this.Index[1].LineColor="rgb(218,112,214)";

    this.BindData=function(hqChart,windowIndex,hisData)
    {
        var paint=hqChart.GetChartPaint(windowIndex);

        if (paint.length!=this.Index.length) return false;

        var closeData=hisData.GetClose();
        var highData=hisData.GetHigh();
        var lowData=hisData.GetLow();

        //WR1:100*(HHV(HIGH,N)-CLOSE)/(HHV(HIGH,N)-LLV(LOW,N));
        var tempData=HQIndexFormula.ARRAY_SUBTRACT(HQIndexFormula.HHV(highData,this.Index[0].Param),closeData);
        var tempData2=HQIndexFormula.ARRAY_SUBTRACT(HQIndexFormula.HHV(highData,this.Index[0].Param),HQIndexFormula.LLV(lowData,this.Index[0].Param));
        var tempData3=HQIndexFormula.ARRAY_MULTIPLY(HQIndexFormula.ARRAY_DIVIDE(tempData,tempData2),100);

        paint[0].Data.Data=tempData3;

        //WR2:100*(HHV(HIGH,N1)-CLOSE)/(HHV(HIGH,N1)-LLV(LOW,N1));
        var tempData=HQIndexFormula.ARRAY_SUBTRACT(HQIndexFormula.HHV(highData,this.Index[1].Param),closeData);
        var tempData2=HQIndexFormula.ARRAY_SUBTRACT(HQIndexFormula.HHV(highData,this.Index[1].Param),HQIndexFormula.LLV(lowData,this.Index[1].Param));
        var tempData3=HQIndexFormula.ARRAY_MULTIPLY(HQIndexFormula.ARRAY_DIVIDE(tempData,tempData2),100);
        paint[1].Data.Data=tempData3;
        

        var titleIndex=windowIndex+1;

        for(var i in paint)
        {
            hqChart.TitlePaint[titleIndex].Data[i]=new DynamicTitleData(paint[i].Data,this.Index[i].Name,this.Index[i].LineColor);
        }

        hqChart.TitlePaint[titleIndex].Title="WR("+this.Index[0].Param+","+this.Index[1].Param+")";
        return true;
    }
}


/*
    OBV 累积能量线
    VA:=IF(CLOSE>REF(CLOSE,1),VOL,-VOL);
    OBV:SUM(IF(CLOSE=REF(CLOSE,1),0,VA),0);
    MAOBV:MA(OBV,M);
*/
function OBVIndex()
{
    this.newMethod=BaseIndex;   //派生
    this.newMethod('OBV');
    delete this.newMethod;

    this.Index=new Array(
        new IndexInfo("OBV",30),
        new IndexInfo("MAOBV",null),
    );

    this.Index[0].LineColor="rgb(255,130,71)";
    this.Index[1].LineColor="rgb(218,112,214)";

    this.BindData=function(hqChart,windowIndex,hisData)
    {
        var paint=hqChart.GetChartPaint(windowIndex);

        if (paint.length!=this.Index.length) return false;

        var closeData=hisData.GetClose();
        var close1Data=HQIndexFormula.REF(closeData,1);
        var volData=hisData.GetVol();
        var vol2Data=HQIndexFormula.ARRAY_MULTIPLY(volData,-1); //负数成交量

        //VA:=IF(CLOSE>REF(CLOSE,1),VOL,-VOL);
        var tempData=HQIndexFormula.ARRAY_IF(HQIndexFormula.ARRAY_GT(closeData,close1Data),volData,vol2Data);

        //OBV:SUM(IF(CLOSE=REF(CLOSE,1),0,VA),0);
        var tempData2=HQIndexFormula.SUM(HQIndexFormula.ARRAY_IF(HQIndexFormula.ARRAY_EQ(closeData,close1Data),0,tempData),0);
        paint[0].Data.Data=tempData2;

        //MAOBV:MA(OBV,M);
        var tempData3=HQIndexFormula.MA(tempData2,this.Index[0].Param);

        paint[1].Data.Data=tempData3;
        
        var titleIndex=windowIndex+1;

        for(var i in paint)
        {
            hqChart.TitlePaint[titleIndex].Data[i]=new DynamicTitleData(paint[i].Data,this.Index[i].Name,this.Index[i].LineColor);
        }

        hqChart.TitlePaint[titleIndex].Title="OBV("+this.Index[0].Param+")";
        return true;
    } 
}


/*
    BIAS 乖离率
    BIAS1 :(CLOSE-MA(CLOSE,N1))/MA(CLOSE,N1)*100;
    BIAS2 :(CLOSE-MA(CLOSE,N2))/MA(CLOSE,N2)*100;
    BIAS3 :(CLOSE-MA(CLOSE,N3))/MA(CLOSE,N3)*100;
*/
function BIASIndex()
{
    this.newMethod=BaseIndex;   //派生
    this.newMethod('OBV');
    delete this.newMethod; 

    this.Index=new Array(
        new IndexInfo("BIAS1",6),
        new IndexInfo("BIAS2",12),
        new IndexInfo("BIAS3",24),
    );

    this.Index[0].LineColor="rgb(255,130,71)";
    this.Index[1].LineColor="rgb(218,112,214)";
    this.Index[2].LineColor="rgb(255,52,179)";

    this.BindData=function(hqChart,windowIndex,hisData)
    {
        var paint=hqChart.GetChartPaint(windowIndex);

        if (paint.length!=this.Index.length) return false;

        var closeData=hisData.GetClose();
        
        for(var i in this.Index)
        {
            var closeMAdata=HQIndexFormula.MA(closeData,this.Index[i].Param);
            var data=HQIndexFormula.ARRAY_MULTIPLY(HQIndexFormula.ARRAY_DIVIDE(HQIndexFormula.ARRAY_SUBTRACT(closeData,closeMAdata),closeMAdata),100);
            paint[i].Data.Data=data;
        }

        var titleIndex=windowIndex+1;

        for(var i in paint)
        {
            hqChart.TitlePaint[titleIndex].Data[i]=new DynamicTitleData(paint[i].Data,this.Index[i].Name,this.Index[i].LineColor);
        }

        hqChart.TitlePaint[titleIndex].Title="BIAS("+this.Index[0].Param+','+this.Index[1].Param+','+this.Index[2].Param+")";
        return true;
    } 
}

/*
    DMI 趋向指标
    MTR:EXPMEMA(MAX(MAX(HIGH-LOW,ABS(HIGH-REF(CLOSE,1))),ABS(REF(CLOSE,1)-LOW)),N);
    HD :=HIGH-REF(HIGH,1);
    LD :=REF(LOW,1)-LOW;
    DMP:=EXPMEMA(IF(HD>0&&HD>LD,HD,0),N);
    DMM:=EXPMEMA(IF(LD>0&&LD>HD,LD,0),N);
    PDI: DMP*100/MTR;
    MDI: DMM*100/MTR;
    ADX: EXPMEMA(ABS(MDI-PDI)/(MDI+PDI)*100,MM);
    ADXR:EXPMEMA(ADX,MM);
*/
function DMIIndex()
{
    this.newMethod=BaseIndex;   //派生
    this.newMethod('DMI');
    delete this.newMethod; 

    this.Index=new Array(
        new IndexInfo("PDI",14),
        new IndexInfo("MDI",6),
        new IndexInfo("ADX",null),
        new IndexInfo("ADXR",null),
    );

    this.Index[0].LineColor=g_JSChartResource.Index.LineColor[0];
    this.Index[1].LineColor=g_JSChartResource.Index.LineColor[1];
    this.Index[2].LineColor=g_JSChartResource.Index.LineColor[2];
    this.Index[3].LineColor=g_JSChartResource.Index.LineColor[3];

    this.BindData=function(hqChart,windowIndex,hisData)
    {
        var paint=hqChart.GetChartPaint(windowIndex);

        if (paint.length!=this.Index.length) return false;

        var closeData=hisData.GetClose();
        var highData=hisData.GetHigh();
        var lowData=hisData.GetLow();
        
        // MTR:EXPMEMA(MAX(MAX(HIGH-LOW,ABS(HIGH-REF(CLOSE,1))),ABS(REF(CLOSE,1)-LOW)),N);
        var MTRData=HQIndexFormula.MA(
                HQIndexFormula.MAX(
                    HQIndexFormula.MAX(
                        HQIndexFormula.ARRAY_SUBTRACT(highData,lowData),
                        HQIndexFormula.ABS(HQIndexFormula.ARRAY_SUBTRACT(highData,HQIndexFormula.REF(closeData,1)))),
                HQIndexFormula.ABS(HQIndexFormula.ARRAY_SUBTRACT(lowData,HQIndexFormula.REF(closeData,1)))),
                this.Index[0].Param);

        //HD := HIGH-REF(HIGH,1);
        var HDData=HQIndexFormula.ARRAY_SUBTRACT(highData,HQIndexFormula.REF(highData,1));
        //LD := REF(LOW,1)-LOW;
        var LDData=HQIndexFormula.ARRAY_SUBTRACT(HQIndexFormula.REF(lowData,1),lowData);
        //DMP:=EXPMEMA(IF(HD>0&&HD>LD,HD,0),N);
        var DMPData=HQIndexFormula.MA(
            HQIndexFormula.ARRAY_IF(
                HQIndexFormula.ARRAY_AND(HQIndexFormula.ARRAY_GT(HDData,0),HQIndexFormula.ARRAY_GT(HDData,LDData))
                ,HDData,0)
            ,this.Index[0].Param);
        //DMM:=EXPMEMA(IF(LD>0&&LD>HD,LD,0),N);
        var DMMData=HQIndexFormula.MA(
            HQIndexFormula.ARRAY_IF(
                HQIndexFormula.ARRAY_AND(HQIndexFormula.ARRAY_GT(LDData,0),HQIndexFormula.ARRAY_GT(LDData,HDData))
                ,LDData,0)
            ,this.Index[0].Param);

        //PDI: DMP*100/MTR;
        var PDIData=HQIndexFormula.ARRAY_DIVIDE(HQIndexFormula.ARRAY_MULTIPLY(DMPData,100),MTRData);
        //MDI: DMM*100/MTR;
        var MDIData=HQIndexFormula.ARRAY_DIVIDE(HQIndexFormula.ARRAY_MULTIPLY(DMMData,100),MTRData);
        //ADX: EXPMEMA(ABS(MDI-PDI)/(MDI+PDI)*100,MM);
        var ADXData=HQIndexFormula.MA(
            HQIndexFormula.ARRAY_MULTIPLY(
                HQIndexFormula.ARRAY_DIVIDE(
                    HQIndexFormula.ABS(HQIndexFormula.ARRAY_SUBTRACT(MDIData,PDIData)),HQIndexFormula.ARRAY_ADD(MDIData,PDIData)
                ),100),
            this.Index[1].Param);
        //ADXR:EXPMEMA(ADX,MM);
        var ADXRData=HQIndexFormula.MA(ADXData,this.Index[1].Param);

        paint[0].Data.Data=PDIData;
        paint[1].Data.Data=MDIData;
        paint[2].Data.Data=ADXData;
        paint[3].Data.Data=ADXRData;

        var titleIndex=windowIndex+1;

        for(var i in paint)
        {
            hqChart.TitlePaint[titleIndex].Data[i]=new DynamicTitleData(paint[i].Data,this.Index[i].Name,this.Index[i].LineColor);
        }

        hqChart.TitlePaint[titleIndex].Title="DMI("+this.Index[0].Param+','+this.Index[1].Param+")";
        return true;
    } 
}

/*
    CR 带状能量线
    MID:=REF(HIGH+LOW,1)/2;
    CR:SUM(MAX(0,HIGH-MID),N)/SUM(MAX(0,MID-LOW),N)*100;
    MA1:REF(MA(CR,M1),M1/2.5+1);
    MA2:REF(MA(CR,M2),M2/2.5+1);
    MA3:REF(MA(CR,M3),M3/2.5+1);
    MA4:REF(MA(CR,M4),M4/2.5+1);
*/
function CRIndex()
{
    this.newMethod=BaseIndex;   //派生
    this.newMethod('CR');
    delete this.newMethod; 

    this.Index=new Array(
        new IndexInfo("CR",26),
        new IndexInfo("MA1",10),
        new IndexInfo("MA2",20),
        new IndexInfo("MA3",40),
        new IndexInfo("MA4",62),
    );

    this.Index[0].LineColor=g_JSChartResource.Index.LineColor[0];
    this.Index[1].LineColor=g_JSChartResource.Index.LineColor[1];
    this.Index[2].LineColor=g_JSChartResource.Index.LineColor[2];
    this.Index[3].LineColor=g_JSChartResource.Index.LineColor[3];
    this.Index[4].LineColor=g_JSChartResource.Index.LineColor[4];

    this.BindData=function(hqChart,windowIndex,hisData)
    {
        var paint=hqChart.GetChartPaint(windowIndex);

        if (paint.length!=this.Index.length) return false;

        var closeData=hisData.GetClose();
        var highData=hisData.GetHigh();
        var lowData=hisData.GetLow();

        //MID:=REF(HIGH+LOW,1)/2;
        var MDIData=HQIndexFormula.ARRAY_DIVIDE(HQIndexFormula.REF(HQIndexFormula.ARRAY_ADD(highData,lowData),1),2);
        //CR:SUM(MAX(0,HIGH-MID),N)/SUM(MAX(0,MID-LOW),N)*100;
        var CRData=HQIndexFormula.ARRAY_MULTIPLY(
                HQIndexFormula.ARRAY_DIVIDE(
                    HQIndexFormula.SUM(
                        HQIndexFormula.MAX(HQIndexFormula.ARRAY_SUBTRACT(highData,MDIData),0),this.Index[0].Param),
                    HQIndexFormula.SUM(
                        HQIndexFormula.MAX(HQIndexFormula.ARRAY_SUBTRACT(MDIData,lowData),0),this.Index[0].Param))
                ,100);
        //MA1:REF(MA(CR,M1),M1/2.5+1);
        var MA1Data= HQIndexFormula.REF(HQIndexFormula.MA(CRData,this.Index[1].Param),parseInt(this.Index[1].Param/2.5+1));
        //MA2:REF(MA(CR,M2),M2/2.5+1);
        var MA2Data= HQIndexFormula.REF(HQIndexFormula.MA(CRData,this.Index[2].Param),parseInt(this.Index[2].Param/2.5+1));
        //MA3:REF(MA(CR,M3),M3/2.5+1);
        var MA3Data= HQIndexFormula.REF(HQIndexFormula.MA(CRData,this.Index[3].Param),parseInt(this.Index[3].Param/2.5+1));
        //MA4:REF(MA(CR,M4),M4/2.5+1);
        var MA4Data= HQIndexFormula.REF(HQIndexFormula.MA(CRData,this.Index[4].Param),parseInt(this.Index[4].Param/2.5+1));


        paint[0].Data.Data=CRData;
        paint[1].Data.Data=MA1Data;
        paint[2].Data.Data=MA2Data;
        paint[3].Data.Data=MA3Data;
        paint[4].Data.Data=MA4Data;

        var titleIndex=windowIndex+1;

        for(var i in paint)
        {
            hqChart.TitlePaint[titleIndex].Data[i]=new DynamicTitleData(paint[i].Data,this.Index[i].Name,this.Index[i].LineColor);
        }

        hqChart.TitlePaint[titleIndex].Title="CR("+this.Index[0].Param+','+this.Index[1].Param+','+this.Index[2].Param+")";
        return true;
    } 
}


/*
    BOLL 布林线 (主线数据)
    BOLL:MA(CLOSE,N);
    UPPER:BOLL+M*STD(CLOSE,N);
    LOWER:BOLL-M*STD(CLOSE,N);
*/
function BOLLIndex()
{
    this.newMethod=BaseIndex;   //派生
    this.newMethod('BOLL');
    delete this.newMethod; 

    this.Index=new Array(
        new IndexInfo("BOLL",20),
        new IndexInfo("UPPER",2),
        new IndexInfo("LOWER",null),
    );

    this.Index[0].LineColor=g_JSChartResource.Index.LineColor[0];
    this.Index[1].LineColor=g_JSChartResource.Index.LineColor[1];
    this.Index[2].LineColor=g_JSChartResource.Index.LineColor[2];

    this.BindData=function(hqChart,windowIndex,hisData)
    {
        var paint=hqChart.GetChartPaint(windowIndex);

        if (paint.length!=this.Index.length) return false;

        var closeData=hisData.GetClose();

        //BOLL:MA(CLOSE,N);
        var BOLLData=HQIndexFormula.MA(closeData,this.Index[0].Param);
        //UPPER:BOLL+M*STD(CLOSE,N);
        var UPPERData=HQIndexFormula.ARRAY_ADD(
            BOLLData,
            HQIndexFormula.ARRAY_MULTIPLY(
                HQIndexFormula.STD(closeData,this.Index[0].Param),
                this.Index[1].Param)
        );
        //LOWER:BOLL-M*STD(CLOSE,N);
        var LOWERData=HQIndexFormula.ARRAY_SUBTRACT(
            BOLLData,
            HQIndexFormula.ARRAY_MULTIPLY(
                HQIndexFormula.STD(closeData,this.Index[0].Param),
                this.Index[1].Param)
        );
       
        paint[0].Data.Data=BOLLData;
        paint[1].Data.Data=UPPERData;
        paint[2].Data.Data=LOWERData;

        var titleIndex=windowIndex+1;

        for(var i in paint)
        {
            hqChart.TitlePaint[titleIndex].Data[i]=new DynamicTitleData(paint[i].Data,this.Index[i].Name,this.Index[i].LineColor);
        }

        hqChart.TitlePaint[titleIndex].Title="BOLL("+this.Index[0].Param+','+this.Index[1].Param+")";
        return true;
    } 
}

/*
    PSY 心理线
    PSY:COUNT(CLOSE>REF(CLOSE,1),N)/N*100;
    PSYMA:MA(PSY,M);
*/
function PSYIndex()
{
    this.newMethod=BaseIndex;   //派生
    this.newMethod('PSY');
    delete this.newMethod; 

    this.Index=new Array(
        new IndexInfo("PSY",12),
        new IndexInfo("PSYMA",6)
    );

    this.Index[0].LineColor=g_JSChartResource.Index.LineColor[0];
    this.Index[1].LineColor=g_JSChartResource.Index.LineColor[1];

    this.BindData=function(hqChart,windowIndex,hisData)
    {
        var paint=hqChart.GetChartPaint(windowIndex);

        if (paint.length!=this.Index.length) return false;

        var closeData=hisData.GetClose();
        var close1Data=HQIndexFormula.REF(closeData,1);

        
        var test1=HQIndexFormula.COUNT(
            HQIndexFormula.ARRAY_GT(closeData,close1Data),
            this.Index[0].Param);
        var test2=HQIndexFormula.ARRAY_GT(closeData,close1Data);
        

        //PSY:COUNT(CLOSE>REF(CLOSE,1),N)/N*100;
        var PSYData=HQIndexFormula.ARRAY_MULTIPLY(
                HQIndexFormula.ARRAY_DIVIDE(
                    HQIndexFormula.COUNT(
                        HQIndexFormula.ARRAY_GT(closeData,HQIndexFormula.REF(closeData,1)),
                        this.Index[0].Param),
                    this.Index[0].Param),
                100);

        //PSYMA:MA(PSY,M);
        var PSYMAData=HQIndexFormula.MA(PSYData,this.Index[1].Param);
       
        paint[0].Data.Data=PSYData;
        paint[1].Data.Data=PSYMAData;

        var titleIndex=windowIndex+1;

        for(var i in paint)
        {
            hqChart.TitlePaint[titleIndex].Data[i]=new DynamicTitleData(paint[i].Data,this.Index[i].Name,this.Index[i].LineColor);
        }

        hqChart.TitlePaint[titleIndex].Title="PSY("+this.Index[0].Param+','+this.Index[1].Param+")";
        return true;
    } 
}

//是否是指数代码
function IsIndexSymbol(symbol)
{
    upperSymbol=symbol.toUpperCase();
    if (upperSymbol.indexOf('.SH')>0)
    {
        upperSymbol=upperSymbol.replace('.SH','');
        if (upperSymbol.charAt(0)=='0' && parseInt(upperSymbol)<=3000) return true;

    }
    else if (upperSymbol.indexOf('.SZ')>0)
    {
        upperSymbol=upperSymbol.replace('.SZ','');
        if (upperSymbol.charAt(0)=='3' && upperSymbol.charAt(1)=='9') return true;
    }

    return false;
}