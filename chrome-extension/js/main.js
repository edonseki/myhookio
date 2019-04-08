$("#start_button").click(function(){
    if($("#host").val().trim().length == 0){
        alert("Please provide the host which will handle the requests from outside.");
        return;
    }
    if($("#host_port").val().trim().length == 0){
        alert("Please provide the port where local webserver is listening");
        return;
    }
    chrome.extension.sendMessage({ function: "startConnection", host: $("#host").val(), port: $("#host_port").val() }, (response) => {
        if (response.code === 200){
            window.close();
        }
    });
});