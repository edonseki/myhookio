let browser = require('electron').remote.getGlobal('browser');

const itemTemplate = '<tr class="request_row" row_id="{{request_id}}">\n' +
                        '<td style="width: 42px;">{{request_time}}</td>\n' +
                        '<td style="width: 42px;">{{request_method}}</td>\n' +
                        '<td style="width: 84%">{{request_path}}</td>\n' +
                        '<td id="rsp{{request_id}}" style="width: 42px;">{{request_response}}</td>\n' +
                        '<td id="drt{{request_id}}"style="width: 42px;">{{request_duration}}</td>\n' +
                    '</tr>';

const headersItemTemplate = '\n' +
    '                <tr>\n' +
    '                    <td width="50%">{{key}}</td>\n' +
    '                    <td width="50%"><small>{{value}}</small></td>\n' +
    '                </tr>'; 


const prependRequestRow = (request) => {
    let item = itemTemplate;
    const time = new Date().toISOString().slice(0, 19).replace('T', ' ').split(' ')[1];
    item = item.split("{{request_id}}").join(request.id)
        .split("{{request_time}}").join(time)
        .split("{{request_method}}").join(request.method)
        .split("{{request_path}}").join(request.path)
        .split("{{request_response}}").join("...")
        .split("{{request_duration}}").join("...");


        $("#s_no_request_div").css("display", "none");

    $(item).prependTo(".requests_table > tbody");
};


let seconds = 0;
let totalRequests = 0;
let totalResponses = 0;

let windowSize = {};

$(window).resize(function(){
    window.resizeTo(windowSize.width,windowSize.height);
});

window.onbeforeunload = function(e) {
    browser.app.sendMessage({ function: "terminateTheExtension" }, (response) => {});
};

let clearDetailView = () => {
    $("#request_headers").find("tr:gt(0)").remove();
    $("#content-length").html("0");
    $("#content-type").html("");
    $('[content-key="response"]').css('display', 'none');
    $('[content="response"]').css('display', 'none');
    $("#no_request_div").css("display", "block");
    $("#s_no_request_div").css("display", "block");
    $("#request_details_div").css("display", "none");
}

let addRequestHeadersInView = (request) => {
    clearDetailView();
    for(const key in request.headers){
        $("#request_headers tbody").append(headersItemTemplate.split("{{key}}").join(key).split("{{value}}").join(request.headers[key]));

        if(key === 'content-length'){
            $("#content-length").html(request.headers[key]);
        }
        if(key === 'content-type'){
            $("#content-type").html(request.headers[key]);
        }
    }
    for(const key in request.deleted_headers){
        $("#request_headers tbody").append(headersItemTemplate.split("{{key}}").join(key).split("{{value}}").join(request.deleted_headers[key]));
    }

    if (request.origin.substr(0, 7) == "::ffff:") {
        request.origin = request.origin.substr(7);
      }
    $("#request_url").html(request.path);
    $("#request_method").html(request.method);
    $("#request_status_code").html(request.response ? request.response.status : '-');
    $("#request_remote_address").html(request.origin);

    $("#no_request_div").css("display", "none");
    $("#s_no_request_div").css("display", "none");
};

let addRequestResponseHeadersInView = (response) => {
    $("#request_response_headers").find("tr:gt(0)").remove();
    for(const key in response.headers){
        $("#request_response_headers tbody").append(headersItemTemplate.split("{{key}}").join(key).split("{{value}}").join(response.headers[key]));
    }
    /*for(const key in request.deleted_headers){
        $("#request_response_headers tbody").append(headersItemTemplate.split("{{key}}").join(key).split("{{value}}").join(request.deleted_headers[key]));
    }*/
};

let addRequestBodyInView = (request) => {
    $("#request_body").html("\n"+request.body);
};

let addRequestResponseBodyInView = (response) => {
    $("#request_response_body")[0].innerText = response.response_text;
};

let updateResponseDetails = (responseBody) => {
    $("#rsp"+responseBody.id).html(responseBody.status);
    $("#drt"+responseBody.id).html(responseBody.duration+"ms");
};

browser.runtime.onMessage.addListener((message) => {
    switch (message.type){
        case 'request':
            totalRequests ++;
            prependRequestRow(message.body);
            updateStats();
            break;
        case 'response':
            totalResponses++;
            updateResponseDetails(message.body);
            updateStats();
            break;
        case 'status':
            handleConnectionStatus(message);
            break;
    }
});

const updateStats = () => {
    $("#total_requests_count").html(totalRequests);
    $("#total_responses_count").html(totalResponses);
}

const handleConnectionStatus = (status) => {
    if (!status){
        alert('Connection to MyHook is lost. The app will be closed.');
        window.close();
    }
}

$(document).ready(() => {
    const width = window.screen.availWidth/1.08;
    const height = window.screen.availHeight/1.3;
    windowSize = {width: width, height: height};
    $(".tablinks").click(function(){
        $(".tablinks").removeClass('active');
        $(this).addClass('active');
        $(".tabcontent").css('display','none');
        $("[content-key="+$(this).attr("content")+"]").css('display','block');
    });
    $("[content='summary']").click();

    browser.app.sendMessage({ function: "getData" }, (response) => {
        if(typeof response.listeningUrl !== 'undefined' && response.listeningUrl == null){
           alert('Seems the connection to MyHook is lost. The app will be closed.');
           window.close();
           return;
        }
        $("#public_hook").html(response.publicSubdomain);
        $("#local_hook").html(response.listeningUrl);
        document.title += ' '+response.publicSubdomain;
        const requests = response.requestHistory;
        for (const key in requests){
            prependRequestRow(requests[key]);
        }

        startTimer();
    });
});


const startTimer = () => {
    function pad ( val ) { return val > 9 ? val : "0" + val; }
    setInterval( function(){
        $("#tr_seconds").html(pad(++seconds%60)+"");
        $("#tr_minutes").html(pad(parseInt(seconds/60,10))+"");
        $("#tr_hours").html(pad(parseInt(seconds/60/60,10))+"");
    }, 1000);
}

$(".requests_table").delegate('tr', 'click', function() {
    browser.app.sendMessage({ function: "requestDetails" , request_id : $(this).attr('row_id') }, function (request)  {
        addRequestHeadersInView(request);
        addRequestBodyInView(request);
        
        if(typeof request.response !== 'undefined'){
            addRequestResponseHeadersInView(request.response);
            addRequestResponseBodyInView(request.response);
            $('[content-key="response"]').css('display', 'block');
            $('[content="response"]').css('display', 'block');
        }else{
            $('[content-key="response"]').css('display', 'none');
            $('[content="response"]').css('display', 'none');
        }


        $("[content='summary']").click();

        $("#no_request_div").css("display", "none");
        $("#request_details_div").css("display", "block");
    });
});

$(".clear_button").click(function (){
    browser.app.sendMessage({ function: "clearRequestHistory" }, (response) => {
        $(".requests_table > tbody").empty();
        clearDetailView();
        $("#no_request_div").css("display", "block");
        $("#s_no_request_div").css("display", "block");
    });
});

$("#p_hook_copy").click(function(){
  var textArea = document.createElement("textarea");
  textArea.value = $("#public_hook").html().trim();
  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();

  let successful = false;
  try {
    successful = document.execCommand('copy');  
  } catch (err) {
    successful = false;
  }
  document.body.removeChild(textArea);

  $("#p_hook_copy").css("color", successful?'green':'red');
  setTimeout(function(){$("#p_hook_copy").css("color", 'white');}, 1000);
});

$("#pr_hook_copy").click(function(){
    var textArea = document.createElement("textarea");
    textArea.value = $("#local_hook").html().trim();
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
  
    let successful = false;
    try {
      successful = document.execCommand('copy');  
    } catch (err) {
      successful = false;
    }
    document.body.removeChild(textArea);
  
    $("#pr_hook_copy").css("color", successful?'green':'red');
    setTimeout(function(){$("#pr_hook_copy").css("color", 'white');}, 1000);
  });

