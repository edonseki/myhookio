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
    const button = $(this);
    button.html("...");
    button.attr("disabled", true);
    const checkUrl = 'http://myhook.io/url-check?url='+$("#host").val().trim();
    $.get(checkUrl, function(response){
        console.log(response.alive);
        if (typeof response !== 'undefined' && 
            typeof response.alive !== 'undefined' &&
            response.alive === false){
                chrome.extension.sendMessage({ function: "startConnection", host: $("#host").val(), port: $("#host_port").val() }, (response) => {
                    if (typeof response !== 'undefined' && response.code === 200){
                        window.close();
                    }else{
                        button.attr("disabled", false);
                        button.html("START");
                        alert("Could not create connection to server. Please restart the extension and check the internet connection.");
                    }
                });
        }else {
            button.attr("disabled", false);
            button.html("START");
            alert('Seems your localhook ('+$("#host").val().trim()+') is accessible from external network. Your localhook should ping to internal network.');
        }
        
    });

});