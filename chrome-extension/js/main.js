chrome.extension.sendMessage({ function: "getData" }, (response) => {
    if(typeof response !== 'undefined' &&
        typeof response.publicSubdomain !== 'undefined' &&
        response.publicSubdomain !== null){
        window.close();
    }
});
$("#start_button").click(function(){
    if($("#host").val().trim().length == 0){
        alert("Please provide the host which will handle the requests from outside.");
        return;
    }
    if($("#host_port").val().trim().length == 0){
        alert("Please provide the port where local webserver is listening");
        return;
    }
    $(this).html("...");
    $(this).attr("disabled", true);
    chrome.extension.sendMessage({ function: "startConnection", host: $("#host").val(), port: $("#host_port").val() }, (response) => {
        if (response.code === 200){
            window.close();
        }else{
            $(this).attr("disabled", false);
            $(this).html("START");
            alert("Could not create connection to server. Please restart the extension.");
        }
    });
});