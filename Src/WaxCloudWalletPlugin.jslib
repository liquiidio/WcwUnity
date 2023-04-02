var WcwUnityWebGlPlugin =  {
    $waxCloudWalletWebglState: {
        wax : null,
        OnLogin: null,
        OnSign: null,
        OnError: null,
        OnCreateInfo: null,
        OnLogout: null,
        OnWaxProof: null,
        OnUserAccountProof: null,
        Debug: true
    },

// XXX waxSigningURL XXX
// XXX waxAutoSigningURL XXX

    WCWInit: function( 
        rpcAddress,          // string - The WAX public node API endpoint URL you wish to connect to. Required
        tryAutoLogin,        // bool - Always attempt to autologin when your dapp starts up. Default true
        userAccount,         // string - User account to start up with. Optional
        pubKeys,             // json-array - Public keys for the userAccount manually specified above. Optional.
        apiSigner,           // json-object? - Custom signing logic. Note that free bandwidth will not be provided to custom signers. Default Optional
        eosApiArgs,          // json-object? - Custom eosjs constructor arguments to use when instantiating eosjs. Optional
        freeBandwidth,       // bool - Request bandwidth management from WAX. Default true
        feeFallback,         // bool - Add wax fee action if user exhausted their own bandwidth, the free boost. Default true
        verifyTx,            // ??? - Verification function that you can override to confirm that your transactions received from WAX are only modified with bandwidth management actions, 
                             // and that your transaction is otherwise unaltered. The function signature is (userAccount: string,  originalTx: any, augmentedTx: any) => void. 
                             // Where userAccount is the account being signed for, originalTx is the tx generated by your dapp, 
                             // and augmentedTx is the potentially bandwidth-managed altered tx you will receive from WAX. The default verifier does this for you, 
                             // and you should check this to be confident that the verifier is sufficiently rigorous. Optional
        metricsUrl,          // string - used by WAXIO to gather metrics about failed transaction, times it takes to load a transaction. Default Optional
        returnTempAccounts   // bool - using this flag will return temporary accounts or accounts that have signed up for a cloud wallet 
                             // but not paid the introduction fee to get a blockchain account created. When this is set to true, 
                             // using the doLogin function will return blockchain account name that may not exist in the blockchain 
                             // but it will also return an extra boolean flag called isTemp. If this flag is true it is a temporary account, it does not exist in the blockchain yet. 
                             // If this constructor option is false then only accounts which have been activated and have a blockchain account will be returned.
    ){
        if(waxCloudWalletWebglState.Debug){
            console.log("init called");
        }

        try {
		
            var userAccountString = UTF8ToString(userAccount);
            var pubKeyArrayString = UTF8ToString(pubKeys);
            var rpcAddressString = UTF8ToString(rpcAddress);
            var apiSignerString = UTF8ToString(apiSigner);
            var eosApiArgsString = UTF8ToString(eosApiArgs);
            var metricsUrlString = UTF8ToString(metricsUrl);

            var waxJsConfig = {
                rpcEndpoint: rpcAddressString,
                tryAutoLogin: tryAutoLogin
            };


            if(userAccountString !== ""){
                if(waxCloudWalletWebglState.Debug){
                    console.log("userAccountString != null -> " + userAccountString);
                }
                waxJsConfig.userAccount = userAccountString;
            }

            if(pubKeyArrayString !== ""){
                if(waxCloudWalletWebglState.Debug){
                    console.log("pubKeyArrayString != null -> " + pubKeyArrayString);
                }
                waxJsConfig.pubKeys = JSON.parse(pubKeyArrayString);
            }

            if(apiSignerString !== ""){
                if(waxCloudWalletWebglState.Debug){
                    console.log("apiSignerString != null -> " + apiSignerString);
                }
                waxJsConfig.apiSigner = JSON.parse(apiSignerString);
            }

            if(eosApiArgsString !== ""){
                if(waxCloudWalletWebglState.Debug){
                    console.log("eosApiArgsString != null -> " + eosApiArgsString);
                }
                waxJsConfig.eosApiArgs = JSON.parse(eosApiArgsString);
            }

            if(waxCloudWalletWebglState.Debug){
                console.log("freeBandwidth = " + freeBandwidth.toString());
                console.log("feeFallback = " + feeFallback.toString());
                console.log("returnTempAccounts = " + returnTempAccounts.toString());
            }

// XXX verifyTx - TODO

            if(metricsUrlString !== ""){
                if(waxCloudWalletWebglState.Debug){
                    console.log("metricsUrlString != null -> " + metricsUrlString);
                }
                waxJsConfig.metricsUrl = metricsUrlString;
            }


            waxCloudWalletWebglState.wax = new waxjs.WaxJS(waxJsConfig);
            if(waxCloudWalletWebglState.Debug){
                console.log("wax Initialized!");
                console.log("waxJsConfig: " + JSON.stringify(waxJsConfig));
            }
        } catch(e) {
            if(waxCloudWalletWebglState.Debug){
                console.log(e.message);
            }

            var msg = JSON.stringify({ message: e.message });
			var length = lengthBytesUTF8(msg) + 1;
			var buffer = _malloc(length);
			stringToUTF8(msg, buffer, length);

			try {
				Module.dynCall_vi(waxCloudWalletWebglState.OnError, buffer);
			} finally {
				_free(buffer);
			}
        }
    },

    WCWLogin: async function () {
        if(waxCloudWalletWebglState.Debug){
            console.log("Login called");        
        }

        var msg = "";
        var error = false;

        if(waxCloudWalletWebglState.wax. && waxCloudWalletWebglState.wax.){
            error = true;
            msg = JSON.stringify({ message: "Calling Login unnecessary if account and pubKeys are provided" });
        }
        else{
            try {
                const userAccount = await waxCloudWalletWebglState.wax.login();
                msg = JSON.stringify({ account: userAccount });
            } catch(e) {
                if(waxCloudWalletWebglState.Debug){
                    console.log(e.message);
                }
                error = true;
                msg = JSON.stringify({ message: e.message });
            }        
        }

        var length = lengthBytesUTF8(msg) + 1;
		var buffer = _malloc(length);
		stringToUTF8(msg, buffer, length);

		try {
            if(error)
	            Module.dynCall_vi(waxCloudWalletWebglState.OnError, buffer);
            else
                Module.dynCall_vi(waxCloudWalletWebglState.OnLogin, buffer);
		} finally {
			_free(buffer);
        }
    },

    WCWSign: async function (actionDataJsonString) {
        if(waxCloudWalletWebglState.Debug){
            console.log("Sign called");        
            console.log(UTF8ToString(actionDataJsonString));
        }

        var msg = "";
        var error = false;

        if(!waxCloudWalletWebglState.wax.api) {
            msg = JSON.stringify({ message: "Login First!" });
            error = true;
        }

        if(!error){
            const actionDataJson = JSON.parse(UTF8ToString(actionDataJsonString));
            try {
                const result = await waxCloudWalletWebglState.wax.api.transact({
                    actions: actionDataJson
                }, 
                {
                    blocksBehind: 3,
                    expireSeconds: 30
                });

                var msg = JSON.stringify({ result: result });
			    var length = lengthBytesUTF8(msg) + 1;
			    var buffer = _malloc(length);
			    stringToUTF8(msg, buffer, length);

			    try {
				    Module.dynCall_vi(waxCloudWalletWebglState.OnSign, buffer);
			    } finally {
				    _free(buffer);
			    }
                return;
            } catch(e) {
                if(waxCloudWalletWebglState.Debug){
                    console.log(e.message);
                }
                error = true;
                msg = JSON.stringify({ message: e.message });
            }
        }

        var length = lengthBytesUTF8(msg) + 1;
		var buffer = _malloc(length);
		stringToUTF8(msg, buffer, length);

		try {
            if(error)
	            Module.dynCall_vi(waxCloudWalletWebglState.OnError, buffer);
            else
                Module.dynCall_vi(waxCloudWalletWebglState.OnLogin, buffer);
		} finally {
			_free(buffer);
        }
    },

    WCWCreateInfo: async function () {
        if(waxCloudWalletWebglState.Debug){
            console.log("createInfo called");        
        }

        var msg = "";
        var error = false;

        if(waxCloudWalletWebglState.wax.isTemp){
           try {
                const result = await waxCloudWalletWebglState.wax.createInfo();
                msg = JSON.stringify({ createInfoResult: result });
            } catch(e) {
                if(waxCloudWalletWebglState.Debug){
                    console.log(e.message);
                }
                error = true;
                msg = JSON.stringify({ message: e.message });
            }
        }
        else {
            error = true;
            msg = JSON.stringify({ message: "Account is not Temp" });
        }

        var length = lengthBytesUTF8(msg) + 1;
		var buffer = _malloc(length);
		stringToUTF8(msg, buffer, length);

		try {
            if(error)
	            Module.dynCall_vi(waxCloudWalletWebglState.OnError, buffer);
            else
                Module.dynCall_vi(waxCloudWalletWebglState.OnCreateInfo, buffer);
		} finally {
			_free(buffer);
        }
    },

    WCWLogout: async function () {
        if(waxCloudWalletWebglState.Debug){
            console.log("Logout called");        
        }

        var msg = "";
        var error = false;

        try {
            const result = await waxCloudWalletWebglState.wax.logout();
            msg = JSON.stringify({ logoutResult: result });
        } catch(e) {
            if(waxCloudWalletWebglState.Debug){
                console.log(e.message);
            }
            error = true;
            msg = JSON.stringify({ message: e.message });
        }


        var length = lengthBytesUTF8(msg) + 1;
		var buffer = _malloc(length);
		stringToUTF8(msg, buffer, length);

		try {
            if(error)
	            Module.dynCall_vi(waxCloudWalletWebglState.OnError, buffer);
            else
                Module.dynCall_vi(waxCloudWalletWebglState.OnLogout, buffer);
		} finally {
			_free(buffer);
        }
    },

     WCWWaxProof: function (nonce, verify) {
        if(waxCloudWalletWebglState.Debug){
            console.log("WCWWaxProof called");        
        }

        var msg = "";
        var error = false;

        var nonceString = UTF8ToString(nonce);

        try {
            const result = await waxCloudWalletWebglState.wax.waxProof(nonceString, verify);
            msg = JSON.stringify({ waxProofResult: result });
        } catch(e) {
            if(waxCloudWalletWebglState.Debug){
                console.log(e.message);
            }
            error = true;
            msg = JSON.stringify({ message: e.message });
        }


        var length = lengthBytesUTF8(msg) + 1;
		var buffer = _malloc(length);
		stringToUTF8(msg, buffer, length);

		try {
            if(error)
	            Module.dynCall_vi(waxCloudWalletWebglState.OnError, buffer);
            else
                Module.dynCall_vi(waxCloudWalletWebglState.OnWaxProof, buffer);
		} finally {
			_free(buffer);
        }
    },

    WCWUserAccountProof: function (nonce, description, verify) {
        if(waxCloudWalletWebglState.Debug){
            console.log("WCWUserAccountProof called");        
        }

        var msg = "";
        var error = false;

        try {
            const result = await waxCloudWalletWebglState.wax.userAccountProof(nonce, description, verify);
            msg = JSON.stringify({ userAccountProofResult: result });
        } catch(e) {
            if(waxCloudWalletWebglState.Debug){
                console.log(e.message);
            }
            error = true;
            msg = JSON.stringify({ message: e.message });
        }


        var length = lengthBytesUTF8(msg) + 1;
		var buffer = _malloc(length);
		stringToUTF8(msg, buffer, length);

		try {
            if(error)
	            Module.dynCall_vi(waxCloudWalletWebglState.OnError, buffer);
            else
                Module.dynCall_vi(waxCloudWalletWebglState.OnUserAccountProof, buffer);
		} finally {
			_free(buffer);
        }
    },

    WCWSetOnLogin: function (callback) {
        if(waxCloudWalletWebglState.Debug){
            console.log("WaxSetOnLogin called");        
        }
        waxCloudWalletWebglState.OnLogin = callback;
    },

    WCWSetOnSign: function (callback) {
        if(waxCloudWalletWebglState.Debug){
            console.log("WaxSetOnSign called");        
        }
        waxCloudWalletWebglState.OnSign = callback;
    },

    WCWSetOnError: function (callback) {
        if(waxCloudWalletWebglState.Debug){
            console.log("WaxSetOnError called");        
        }
        waxCloudWalletWebglState.OnError = callback;
    },

    WCWSetOnCreateInfo: function (callback) {
        if(waxCloudWalletWebglState.Debug){
            console.log("WCWCreateInfo called");        
        }
        waxCloudWalletWebglState.OnCreateInfo = callback;
    },

    WCWSetOnLogout: function (callback) {
        if(waxCloudWalletWebglState.Debug){
            console.log("WCWSetOnLogout called");        
        }
        waxCloudWalletWebglState.OnLogout = callback;
    },

    WCWSetOnWaxProof: function (callback) {
        if(waxCloudWalletWebglState.Debug){
            console.log("WCWSetOnWaxProof called");        
        }
        waxCloudWalletWebglState.OnWaxProof = callback;
    },

    WCWSetOnUserAccountProof: function (callback) {
        if(waxCloudWalletWebglState.Debug){
            console.log("WCWSetOnUserAccountProof called");        
        }
        waxCloudWalletWebglState.OnUserAccountProof = callback;
    },
};

autoAddDeps(WcwUnityWebGlPlugin, '$waxCloudWalletWebglState');
mergeInto(LibraryManager.library, WcwUnityWebGlPlugin);
