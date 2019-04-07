const itemTemplate = '<tr row_id="{{request_id}}">\n' +
                        '<td style="width: 42px;">{{request_method}}</td>\n' +
                        '<td style="width: 76%">{{request_path}}</td>\n' +
                        '<td id="rsp{{request_id}}" style="width: 42px;">{{request_response}}</td>\n' +
                        '<td id="drt{{request_id}}"style="width: 42px;">{{request_duration}}</td>\n' +
                    '</tr>';


let prependRequestRow = (request) => {
    let item = itemTemplate;
    item = item.split("{{request_id}}").join(request.id)
        .split("{{request_method}}").join(request.method)
        .split("{{request_path}}").join(request.path)
        .split("{{request_response}}").join("...")
        .split("{{request_duration}}").join("...");

    $(item).prependTo(".requests_table > tbody");
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