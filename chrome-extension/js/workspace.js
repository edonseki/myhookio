const itemTemplate = '<tr class="request_row" row_id="{{request_id}}">\n' +
                        '<td style="width: 42px;">{{request_method}}</td>\n' +
                        '<td style="width: 76%">{{request_path}}</td>\n' +
                        '<td id="rsp{{request_id}}" style="width: 42px;">{{request_response}}</td>\n' +
                        '<td id="drt{{request_id}}"style="width: 42px;">{{request_duration}}</td>\n' +
                    '</tr>';

const headersItemTemplate = '\n' +
    '                <tr>\n' +
    '                    <td width="50%">{{key}}</td>\n' +
    '                    <td width="50%"><small>{{value}}</small></td>\n' +
    '                </tr>';


let prependRequestRow = (request) => {
    console.log(request);
    let item = itemTemplate;
    item = item.split("{{request_id}}").join(request.id)
        .split("{{request_method}}").join(request.method)
        .split("{{request_path}}").join(request.path)
        .split("{{request_response}}").join("...")
        .split("{{request_duration}}").join("...");

    $(item).prependTo(".requests_table > tbody");

};

let addRequestHeadersInView = (request) => {
    $("#request_headers").find("tr:gt(0)").remove();
    $("#content-length").html("");
    $("#content-type").html("");
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
};

let addRequestBodyInView = (request) => {
    $("#request_body").html("\n"+request.body);
};

let addRequestAsRawInView = (request) => {

};

let updateResponseDetails = (responseBody) => {
    $("#rsp"+responseBody.id).html(responseBody.status);
    $("#drt"+responseBody.id).html(responseBody.duration+"ms");
};

chrome.runtime.onMessage.addListener((message) => {
    switch (message.type){
        case 'request':
            prependRequestRow(message.body);
            break;
        case 'response':
            updateResponseDetails(message.body);
            break;
    }
});

$(document).ready(() => {
    $(".tablinks").click(function(){
        $(".tablinks").removeClass('active');
        $(this).addClass('active');
        $(".tabcontent").css('display','none');
        $("[content-key="+$(this).attr("content")+"]").css('display','block');
    });
    $("[content=summary]").click();

    chrome.extension.sendMessage({ function: "getData" }, (response) => {
        $("#public_hook").html(response.publicSubdomain);
        $("#local_hook").html(response.listeningUrl);
        const requests = response.requestHistory;
        for (const key in requests){
            prependRequestRow(requests[key]);
        }
    });
});

$(".requests_table").delegate('tr', 'click', function() {
    chrome.extension.sendMessage({ function: "requestDetails" , request_id : $(this).attr('row_id') }, (response) => {
        addRequestHeadersInView(response);
        addRequestBodyInView(response);
    });
});