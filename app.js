/* global helpers */

(function() {

console.log("Loading app.js");

  return {

    defaultState: 'loading_screen',

    resources: 
    {
        APP_LOCATION_TICKET: "ticket_sidebar",
        APP_LOCATION_USER: "user_sidebar",

        FIELD_TYPE_TEXT: "text",
        FIELD_TYPE_IMAGE: "image",
        FIELD_TYPE_CHECKBOX: "checkbox",

        USER_FIELD_NAME_CUSTOMER_TYPE: "mailshot_customer_type",
        USER_FIELD_NAME_CUSTOMER_TYPE_VALUE_NOT_SET: null,
        USER_FIELD_NAME_CUSTOMER_TYPE_VALUE_EXCLUDE: "mailshot_exclude_from_mailshot",
        USER_FIELD_NAME_CUSTOMER_TYPE_VALUE_USE_DEFAULT: "mailshot_use_default_values",
        USER_FIELD_NAME_CUSTOMER_TYPE_VALUE_USE_ORGANIZATION: "mailshot_use_organisation_values",

        MAILSHOT_FIELD_NAMES_CUSTOMER_TYPE: "CUSTOMER",
        MAILSHOT_FIELD_CUSTOMER_TYPE_DEFAULT_VALUE: "SMEs",

        TEMPLATE_NAME_MAIN: "main",
        TEMPLATE_NAME_LOADING: "loading_screen"

        //DATE_PATTERN : /^\d{4}-\d{2}-\d{2}$/
    },

    events: 
    {
        'app.activated'                : 'init',

        // Zendesk API Requests
        'getZendeskUser.done'		: 'getZendeskUser_Done',
        'getZendeskUser.fail'		: 'switchToErrorMessage',
        'updateZendeskUser.done'	: 'updateZendeskUser_Done',
        'updateZendeskUser.fail'	: 'switchToErrorMessage',
        'getZendeskOrganizations.done'  : 'getZendeskOrganizations_Done',
        'getZendeskOrganizations.fail'  : 'switchToErrorMessage',

        'getMailChimpAllListMembers.done'	: 'retrievedMailchimpAllListSubscribers',
        'getMailChimpAllListMembers.fail'	: 'switchToErrorMessage',    

        //mailchimp v3 api requests
        'getMailChimpListMember.done'			: 'retrievedMailchimpSubscriber',
        'getMailChimpListMember.fail'			: 'get_or_createOrUpadateMailChimpListMember_OnFail',
        'createOrUpadateMailChimpListMember.done'	: 'createOrUpadateMailChimpListMember_Done',
        'createOrUpadateMailChimpListMember.fail'	: 'get_or_createOrUpadateMailChimpListMember_OnFail',   

        //buttons on main form
        'click .exclude'            : 'excludeButtonOnClick',
        'click .organization'       : 'organizationButtonOnClick',
        'click .standard'           : 'standardButtonOnClick',
       // 'click .sync_popup'         : 'showSyncModalPopup',

        //buttons on error form
        'click .error_go_back'            : 'resetAppAfterInitialization',
        'click .error_override_mailchimp' : 'createOrUpadateMailChimpListMember_Override_OnClick',
        'click .error_create_new_mailchimp' : 'createOrUpadateMailChimpListMember_Add_New_OnClick',
            
        //modal sync screen events  //show shown hide hidden
    //    'hidden #sync_modal'    : 'afterHidden',

        //main screen events
        'user.mailshot_customer_type.changed' : 'userScreenCustomerTypeFieldChanged'
    },

    requests: 
    {
    	getZendeskUser: function(id)
    	{
    		var userApiCallSettings = 
    		{
				url: helpers.fmt('/api/v2/users/%@.json', id),
				type:'GET',
				dataType: 'json'
			};
			console.log( "API CAll DETAILS FOR getZendeskUser;" );
			console.dir( userApiCallSettings ); console.log();
        	return userApiCallSettings;
		},

        updateZendeskUser: function( userToSyncObject )
        {
            var userApiCallSettings = 
            {
                            url: '/api/v2/users/create_or_update.json',
                            type:'POST',
                            dataType: 'json',
                            contentType: 'application/json',
                            data: JSON.stringify(
                            {
                                    'user': 
                                    { 
                                            'id': userToSyncObject.id, 
                                            'email': userToSyncObject.email,
                                            'user_fields':
                                            {
                                                    'mailshot_customer_type': userToSyncObject.customer_type
                                            }
                                    }
                            })
                    };
                    console.log( "API CAll DETAILS FOR createOrUpdateZendeskUser;" );
                    console.dir( userApiCallSettings ); console.log();
            return userApiCallSettings;
        },

    	getZendeskOrganizations: function(userId, organizationId)
    	{
            var userApiCallSettings = 
            {
                url: ( typeof( organizationId ) !== "undefined" && organizationId !== null ) ? helpers.fmt('/api/v2/organizations/%@.json', organizationId) : helpers.fmt('/api/v2/users/%@/organizations.json', userId),
                type:'GET',
                dataType: 'json'
            };
            console.log( "API CAll DETAILS FOR getZendeskOrganizationsForUser;" );
            console.dir( userApiCallSettings ); console.log();
            return userApiCallSettings;
        },

        getMailChimpAllListMembers: function()
        {
            var jsonCall =
            {
                //url: "https://us13.api.mailchimp.com/2.0/lists/members",
                url: helpers.fmt( "https://%@.api.mailchimp.com/2.0/lists/members.json", this.mailchimp_datacentre_prefix ),
                type: 'POST',
                dataType: 'json',
                contentType: 'application/json; charset=UTF-8',
                data: JSON.stringify(
                {
                    "apikey": this.mailchimp_api_key,
                    "id": this.mailchimp_list_id,
                    "status": "subscribed",
                    "opts": {
                        "start": 0,
                        "limit": 100,
                        "sort_field": "email",
                        "sort_dir": "ASC"
                    }
                })
            };
            console.log( "API CAll DETAILS FOR getMailChimpAllListMembers;" );
            console.dir( jsonCall ); console.log();
            return jsonCall;
        },

        getMailChimpListMember: function( emailAddress )
        {

            if( typeof( emailAddress ) === "undefined" || emailAddress === null )
            {
                return console.warn( "ERROR CONDITION: getMailChimpListMember called with null email address" );
            }

            //require md5 library utils js to create md5 hash of user then get md5 hash of email address
            var md5JSModule = require('md5');
            var md5HashOfEmail = md5JSModule(emailAddress.toLowerCase());
            var jsonCall =
            {
                url: helpers.fmt( "https://%@.api.mailchimp.com/3.0/lists/%@/members/%@", this.mailchimp_datacentre_prefix, this.mailchimp_list_id, md5HashOfEmail ),
                type: 'GET',
                dataType: 'json',
                contentType: 'application/json; charset=UTF-8',
                headers: 
                {
                    "Authorization": "Basic " + btoa( "api:" + this.mailchimp_api_key )
                }
            };
            console.log( "API CAll DETAILS FOR getMailChimpListMember;" );
            console.dir( jsonCall ); console.log();
            return jsonCall;
        },

        createOrUpadateMailChimpListMember: function( mailchimpSyncUser, updateNotCreate )
        {

            if( mailchimpSyncUser === null || mailchimpSyncUser.email_address == null )
            {
                return console.warn( "ERROR CONDITION: createOrUpadateMailChimpListMember called with either null user or user with no email address" );
            }

            //require md5 library utils js to create md5 hash of user then get md5 hash of email address
            var md5JSModule = require('md5');
            var md5HashOfEmail = md5JSModule(mailchimpSyncUser.email_address.toLowerCase());

            var dataJSON = 				
            {
                "id": md5HashOfEmail,
                "email_address": mailchimpSyncUser.email_address,
                "email_type": "html",
                "status": mailchimpSyncUser.status,
                "status_if_new": "subscribed",
                "merge_fields":
                {  //these will be populated below
                },
                "vip": ( mailchimpSyncUser.customer_type === this.resources.USER_FIELD_NAME_CUSTOMER_TYPE_VALUE_USE_ORGANIZATION )
            };

            //mandatory merge fields
            dataJSON.merge_fields[ this.mailchimp_merge_field_forename ] = mailchimpSyncUser.forename;
            dataJSON.merge_fields[ this.mailchimp_merge_field_surname ] = mailchimpSyncUser.surname;
            dataJSON.merge_fields[ this.resources.MAILSHOT_FIELD_NAMES_CUSTOMER_TYPE ] = mailchimpSyncUser.customer_type;

            //extra merge fields for organisation and mailchimp only fields
            for (var i=0; i < mailchimpSyncUser.extra_merge_fields.length; i++) 
            {
                dataJSON.merge_fields[ mailchimpSyncUser.extra_merge_fields[ i ].field_def.mailshot_field ] = mailchimpSyncUser.extra_merge_fields[ i ].value;
            }

            var jsonCall =
            {
                url: helpers.fmt( "https://%@.api.mailchimp.com/3.0/lists/%@/members/%@", this.mailchimp_datacentre_prefix, this.mailchimp_list_id, (updateNotCreate) ? md5HashOfEmail : "" ),
                type: updateNotCreate ? 'PUT' : 'POST',
                dataType: 'json',
                contentType: 'application/json; charset=UTF-8',
                headers: 
                {
                        "Authorization": "Basic " + btoa( "api:" + this.mailchimp_api_key )
                },
                data: JSON.stringify( dataJSON )
            };
            console.log( "API CAll DETAILS FOR createOrUpadateMailChimpListMember;" );
            console.dir( jsonCall ); console.log();
            return jsonCall;
        },

        deleteMailChimpListMember: function( mailchimpSyncUser )
        {

            if( mailchimpSyncUser === null || mailchimpSyncUser.email_address === null )
            {
                return console.warn( "ERROR CONDITION: deleteMailChimpListMember called with either null user or user with no email address" );
            }

            //require md5 library utils js to create md5 hash of user then get md5 hash of email address
            var md5JSModule = require('md5');
            var md5HashOfEmail = md5JSModule(mailchimpSyncUser.email_address.toLowerCase());

            var jsonCall =
            {
                url: helpers.fmt( "https://%@.api.mailchimp.com/3.0/lists/%@/members/%@", this.mailchimp_datacentre_prefix, this.mailchimp_list_id, md5HashOfEmail ),
                type: 'DELETE',
                dataType: 'json',
                contentType: 'application/json; charset=UTF-8',
                headers: 
                {
                        "Authorization": "Basic " + btoa( "api:" + this.mailchimp_api_key )
                }
            };
            console.log( "API CAll DETAILS FOR deleteMailChimpListMember:" );
            console.dir( jsonCall ); console.log();
            return jsonCall;
        }
    },		


    // --- INITIALISATION FUCNTIONS
    init: function() 
    {
    	console.log( "Starting init");
    	console.log( "Location Object:" );
    	console.dir( this.currentLocation() );
    	console.log( "This =" );
        console.dir( this );
        
        //get CommonJS Modules
        this.zendeskObjectsModule = require('ZendeskObjects');
        
        //Get Settings from manifest.js
        this.mailchimp_api_key = this.setting('mailchimp_api_key');
        this.mailchimp_datacentre_prefix = this.setting('mailchimp_datacentre_prefix');
        this.mailchimp_list_id = this.setting('mailchimp_list_id');
        this.mailchimp_merge_field_forename = this.setting('mailchimp_merge_field_forename');
        this.mailchimp_merge_field_surname = this.setting('mailchimp_merge_field_surname');

        //setup field mappings
        this.customer_type_field_mapping = { zendesk_field:'mailshot_customer_display_name', mailshot_field: 'CUSTOMER', type: this.resources.FIELD_TYPE_TEXT, default_value: 'SMEs' };
        this.organization_field_mappings = 
        [ 
            //this.customer_type_field_mapping,
            { field_label: 'Success Email', zendesk_field:'mailshot_success_email_address', mailshot_field: 'FROMEMAIL', type: this.resources.FIELD_TYPE_TEXT, default_value: 'successteam@greenlightpower.net' },
            { field_label: 'Logo URL', zendesk_field:'mailshot_company_logo_url', mailshot_field: 'LOGO', type: this.resources.FIELD_TYPE_IMAGE, default_value:'https://gallery.mailchimp.com/a0a70a7c775f05e19e19fa7aa/images/c7a2e081-f25d-4084-87c4-6eafe598200b.png' }
        ];
        this.user_field_mappings = 
        [ 
            { field_label: 'Site List', zendesk_field:'site_list', mailshot_field: 'SME_SITES', type: this.resources.FIELD_TYPE_TEXT, default_value: '' }
        ];
        this.mailshot_only_field_mappings = 
        [ 
            //this.customer_type_field_mapping,
            { field_label:'Maintenance Emails', mailshot_field: 'SEND_MAINT', type: this.resources.FIELD_TYPE_CHECKBOX, default_value: '0' },
            { field_label:'Announcement Emails', mailshot_field: 'SEND_ANNOU', type: this.resources.FIELD_TYPE_CHECKBOX, default_value:'0' },
            { field_label:'Monthly Scorecards', mailshot_field: 'SEND_CSAT', type: this.resources.FIELD_TYPE_CHECKBOX, default_value:'0' }
        ];

        //delcare other instance variables
        this.mailshot_sync_user = null;
        this.zendesk_user = null;

        this.resetAppAfterInitialization();
    },

    resetAppAfterInitialization: function() 
    {
        //fetch current user object and use it to store gloabl user variables for use later
        this.zendesk_user = null;
        if( this.currentLocation() === this.resources.APP_LOCATION_TICKET )
        {
                this.switchToLoadingScreen( "Loading Zendesk User" );
                this.ajax( 'getZendeskUser', this.ticket().requester().id() ); //this jumps to getZendeskUser_Done
        }
        else if( this.currentLocation() === this.resources.APP_LOCATION_USER )
        {
//CHECK HERE IF USER WAS UPDATED ELSEWHERE!
                this.switchToLoadingScreen( "Loading Zendesk User" );
                this.getUserFromFrameworkInUserSidebarLocation();
        }

        //kill mailshot sync user as we're starting again from scratch
        this.mailshot_sync_user = null;
    },
    
   //ZENDESK USER AND ORGANIZATION DATA API WRAPPER FUNCTIONS
    getZendeskUser_Done: function( userObjectFromDataAPI )
    {
        this.zendesk_user = this.createZendeskUserFromAPIReturnData( userObjectFromDataAPI );

        console.log( "mid getZendeskUser_Done, this.zendesk_user = " );
        console.dir( this.zendesk_user );
       
        //now populate the users obganization object through another API call but only if we need it (user type = organization )
        if( this.zendesk_user.isOrganization() && this.zendesk_user.belongsToOrganization() )
        {
            this.switchToLoadingScreen( "Loading Organization" );
            this.ajax( 'getZendeskOrganizations', this.zendesk_user.id, this.zendesk_user.organization_id );
        }
        //otherwise we've finished getting the user object
        else
        {
            //finished loading user
            this.fetchMailchimpObjectIfNecessary();
        }
    },
    
    createZendeskUserFromAPIReturnData: function( userObjectFromDataAPI )
    {
        console.log( 'Starting createZendeskUserFromAPIReturnData, user object from API = ' );
        console.dir( userObjectFromDataAPI );

        var zendeskUserObjectToReturn = null;

        if( userObjectFromDataAPI !== null )
        {
            //var zdr = new require( "ZendeskObjects" );
            //zdr
            //zendeskUserObjectToReturn = new zdr.ZendeskUser.call( this, //this.createZendeskUserObject( this.createZendeskUserObject(
            zendeskUserObjectToReturn = new this.ZendeskObjects.ZendeskUser(
                this, 
                userObjectFromDataAPI.user.id,
                userObjectFromDataAPI.user.name,
                userObjectFromDataAPI.user.email,
                userObjectFromDataAPI.user.user_fields.mailshot_customer_type,
                ( typeof( userObjectFromDataAPI.user.organization_id ) !== 'undefined' && userObjectFromDataAPI.user.organization_id !== null ) ? userObjectFromDataAPI.user.organization_id : null //being careful as sometimes users can be set to link through to more than one org depending on admin settings
            );
        console.log( 'mid createZendeskUserFromAPIReturnData, just called constructor zendeskUserObjectToReturn = ' );
        console.dir( zendeskUserObjectToReturn );
            //now set the optional extra user fields from returned API data
            zendeskUserObjectToReturn.populateExtraFieldsFromUserAPIData( userObjectFromDataAPI.user );
            
            //we've kept a record of the org id if there is one but now leave org object as null as this info is not available on this API return data
        }
        else console.warn( "createZendeskUserFromAPIReturnData called but userObjectFromDataAPI = null - this should never happen!");

        console.log( 'Finished createZendeskUserFromAPIReturnData, zendeskUserObjectToReturn = ' );
        console.dir( zendeskUserObjectToReturn );
        console.log( 'Finished createZendeskUserFromAPIReturnData, testing clone function on zendeskUserObjectToReturn = ' );
        console.dir( zendeskUserObjectToReturn.clone() );

        return zendeskUserObjectToReturn;
    },
    
    getUserFromFrameworkInUserSidebarLocation: function()
    {
        console.log( 'Starting getUserFromFrameworkInUserSidebarLocation' );
        console.log( 'this.user() object from framework = ' );
        console.dir( this.user() );
        console.log( 'this.user().organizations()[0] object from framework = ' );
        console.dir( this.user().organizations()[0] );

        //fetch first organization object if there is one, null if not
        var usersOrgObject = ( typeof( this.user().organizations()[0] ) !== 'undefined' && this.user().organizations()[0] !== null ) ? this.user().organizations()[0] : null;
        
        //initialize user object
        //this.zendesk_user = new this.zendeskObjectsModule.ZendeskUser( //this.createZendeskUserObject(
        this.zendesk_user = new this.ZendeskObjects.ZendeskUser(
            this,
            this.user().id(),
            this.user().name(),
            this.user().email(),
            this.user().customField( this.resources.USER_FIELD_NAME_CUSTOMER_TYPE ),
            ( usersOrgObject === null ) ? null : usersOrgObject.id()
        );
        
        //now set the optional extra user fields from the framework object
        this.zendesk_user.populateExtraFieldsFromFrameworkUserObject( this.user() );
    
//ADD FOR LOOP HERE TO GET EXTRA USER FIELDS AND EXTRA ORG FIELDS

        //popupate org object if one is set on user record
        if( usersOrgObject !== null )
        {
            console.log( "Found Organization Object" );
            console.dir( usersOrgObject );
            this.zendesk_user.orgObject = new this.ZendeskObjects.ZendeskOrganization( this, usersOrgObject.id(), usersOrgObject.name() );
            this.zendesk_user.orgObject.populateExtraFieldsFromFrameworkOrgObject( usersOrgObject );
        }
        
        console.log( "just got user from user screen, testing clone function" );
        console.dir( this.zendesk_user.clone() );
        
        //we now have full populated user object complete with org object if user has an org
        this.fetchMailchimpObjectIfNecessary();
    },

    updateZendeskUser_Done: function( userObjectFromDataAPI )
    {
        var returnedUser = this.createZendeskUserFromAPIReturnData( userObjectFromDataAPI );
        returnedUser.orgObject = this.zendesk_user.orgObject;  //user object was updated but the org object wasn't so copy the proper org object from org API call on init for this basic one created by the above method
        var oldCustomerType = this.zendesk_user.customer_type;
        this.zendesk_user = returnedUser;
        
        console.log( "updateZendeskUser_Done = got user back from API data and reattached old organization from old user, this.zendesk_user = ");
        console.dir( this.zendesk_user );
        //now populate the users obganization object through another API call but only if we need it (user type = organization )
        if( !this.zendesk_user.isOrganization() && this.zendesk_user.belongsToOrganization() && !this.zendesk_user.orgObjectIsPopulated())
        {
            //changeCustomerType as yet because we still need to load organization object so register the change necessary on user object temporarily
            this.zendesk_user.callChangeCustomerTypeAfterFullyLoadedWithOldType=oldCustomerType;
            this.switchToLoadingScreen( "Loading Organization" );
            this.ajax( 'getZendeskOrganizations', this.zendesk_user.id, this.zendesk_user.organization_id );
        }
        else
        {
            //nothing left to do - so register the new customer type in order to delete mailchimp member if necessary
            this.changeCustomerType( oldCustomerType, this.zendesk_user.customer_type );
        }     
    },

    getZendeskOrganizations_Done: function( organizationObjectFromDataAPI )
    {
        console.log( 'Starting getZendeskOrganizations_Done' );
        console.log( 'organizationObjectFromDataAPI = ' );
        console.dir( organizationObjectFromDataAPI );

        this.zendesk_user.orgObject = this.createZendeskOrganizationFromAPIReturnData( organizationObjectFromDataAPI );
        
        //was this load as a result of pressing the "organization" button?
        if( typeof( this.zendesk_user.callChangeCustomerTypeAfterFullyLoadedWithOldType ) !== "undefined" && this.zendesk_user.callChangeCustomerTypeAfterFullyLoadedWithOldType !== null )
        {
            var oldType = this.zendesk_user.callChangeCustomerTypeAfterFullyLoadedWithOldType;
            this.zendesk_user.callChangeCustomerTypeAfterFullyLoadedWithOldType = null;
            this.changeCustomerType( oldType, this.zendesk_user.customer_type );
        }
        else
        {
            //we now have full populated user object to save complete with org object and no more changes so continue to load form
            this.fetchMailchimpObjectIfNecessary();
        }
    },

	createZendeskOrganizationFromAPIReturnData: function( organizationObjectFromDataAPI )
    {
        console.log( 'Starting createZendeskOrganizationFromAPIReturnData, organizationObjectFromDataAPI = ' );
        console.dir( organizationObjectFromDataAPI );

        var organizationObjectToReturn = null;

        if( typeof( organizationObjectFromDataAPI ) !== "undefined" && organizationObjectFromDataAPI !== null && typeof( organizationObjectFromDataAPI.organization ) !== "undefined" )
        {
            if( organizationObjectFromDataAPI.organization !== null )
            {
                organizationObjectToReturn = new this.ZendeskObjects.ZendeskOrganization(
                    this,
                    organizationObjectFromDataAPI.organization.id,
                    organizationObjectFromDataAPI.organization.name,
                    organizationObjectFromDataAPI.organization.organization_fields[ this.customer_type_field_mapping.zendesk_field ]
                );
                organizationObjectToReturn.populateExtraFieldsFromOrganizationAPIData( organizationObjectFromDataAPI.organization );
            }
        }
        else console.warn( "createZendeskOrganizationFromAPIReturnData called but organizationObjectFromDataAPI = null or doesnt contain a organization property - this should never happen!");

        console.log( 'Finished createZendeskOrganizationFromAPIReturnData, testinc clone() on organizationObjectToReturn = ' );
        console.dir( organizationObjectToReturn.clone() );

        return organizationObjectToReturn;
    },
    
    fetchMailchimpObjectIfNecessary: function()
    {
        console.log( 'Starting fetchMailchimpObjectIfNecessary' );

        //if it's included in the mailchimp sync and we dont already have the mailchimp user then get it
        if( this.zendesk_user.isIncluded() && this.mailshot_sync_user === null )
        {
            this.switchToLoadingScreen( "Loading Mailchimp User" );
            this.ajax( 'getMailChimpListMember', this.zendesk_user.email );
        }
        else
        {
            this.switchToMainTemplate();
        }

        console.log( 'Finished fetchMailchimpObjectIfNecessary' );
    },
    
/*
	userDataInitialized: function()
	{
		if( this.zendesk_user != null )
		{
			console.log( 'user object = ' );
			console.dir( this.zendesk_user );

			//user is definitely initialised so lets see if they are new and havent been configured for mailshot settings yet
			if( this.zendesk_user.customer_type == this.resources.USER_FIELD_NAME_CUSTOMER_TYPE_VALUE_NOT_SET )
			{
				this.switchToMainTemplate();
			}
			else if( this.zendesk_user.customer_type == this.resources.USER_FIELD_NAME_CUSTOMER_TYPE_VALUE_EXCLUDE )
			{
				this.switchToMainTemplate();
			}
			else
			{
				this.switchToMainTemplate();
				//			this.ajax( 'getMailChimpListMember', this.zendesk_user.external_subscriber_id );
			}
		}
		else console.warn( "userDataInitialized called but this.zendesk_user = null - this should never happen!");
	},  

	retrievedMailchimpAllListSubscribers: function( mailchimpSubscriberList ) 
	{
		console.log( "started retrievedMailchimpAllListSubscribers with the following object:" );
		console.dir( mailchimpSubscriberList ); console.log( "" );
		//this.switchToMainTemplate();
	},	
*/
	changeCustomerType: function( oldType, newType ) 
	{
		console.log( "changeCustomerType called" );
		console.log( "oldType: " + oldType );
		console.log( "newType: " + newType );		
		//update user object to keep track of change
		this.zendesk_user.customer_type = newType;

		//NOW TAKE APPROPRIATE ACTION DEPENDING ON OLD AND NEW VALUE

		//if NOT SET or EXCLUDE were selected 
		if( newType === this.resources.USER_FIELD_NAME_CUSTOMER_TYPE_VALUE_NOT_SET || newType === this.resources.USER_FIELD_NAME_CUSTOMER_TYPE_VALUE_EXCLUDE  )
		{
			//if NOT SET or EXCLUDE were selected AND it was previously set to STANDARD or ORGANIZATION
			if( oldType === this.resources.USER_FIELD_NAME_CUSTOMER_TYPE_VALUE_USE_DEFAULT || oldType === this.resources.USER_FIELD_NAME_CUSTOMER_TYPE_VALUE_USE_ORGANIZATION )
			{
				this.deleteExistingUserFromMailchimp( this.mailshot_sync_user );
			}
			//if NOT SET or EXCLUDE were selected AND it was previously set to the other one
			if( oldType !== newType )
			{
				//reload the app template with new updated user object - no need to call mailchimp API
				this.switchToMainTemplate();
			}
		}

		//if ORGANIZATION or STANDARD was selected
		if( newType === this.resources.USER_FIELD_NAME_CUSTOMER_TYPE_VALUE_USE_ORGANIZATION || newType === this.resources.USER_FIELD_NAME_CUSTOMER_TYPE_VALUE_USE_DEFAULT  )
		{
			//if ORGANIZATION or STANDARD  were selected AND it was previously set to EXCLUDE or NOT SET
			if( oldType === this.resources.USER_FIELD_NAME_CUSTOMER_TYPE_VALUE_EXCLUDE || oldType === this.resources.USER_FIELD_NAME_CUSTOMER_TYPE_VALUE_NOT_SET )
			{
				this.syncNewUserToMailchimp( this.zendesk_user );
				//then probably remove the line of code below
				//reload the app with new updated user object
				//this.switchToMainTemplate();
			}
			//if ORGANIZATION or STANDARD  were selected AND it was previously set to the other one
			else if( oldType != newType )
			{
console.log ("INSERT CODE HERE TO ADD UPDATE USER IN MAILCHIMP VIA MAILCHIMP API - if id is not set then update if email match and add if not");
//then probably remove the line of code below
				this.switchToMainTemplate();
			}
		}
	},


	//MAILCHIMP SYNCING WRAPPER FUNCTIONS
	retrievedMailchimpSubscriber: function( returnedMailchimpUser ) 
	{

		console.log( "started retrievedMailchimpSubscriber with the following object:" );
		console.dir( returnedMailchimpUser ); console.log( "" );

		this.mailshot_sync_user = 
		{
			email_address: returnedMailchimpUser.email_address,
			status: "subscribed",
			forename: returnedMailchimpUser.merge_fields[ this.mailchimp_merge_field_forename ],
			surname: returnedMailchimpUser.merge_fields[ this.mailchimp_merge_field_surname  ],
			customer_type: returnedMailchimpUser.merge_fields[ this.customer_type_field_mapping.mailshot_field ],
			extra_merge_fields: []
		};
        
		var arrayIndex = 0;
		for (var i=0; i < this.user_field_mappings.length; i++) 
		{
			this.mailshot_sync_user.extra_merge_fields[ arrayIndex ] = { field_def: this.user_field_mappings[ i ], value: returnedMailchimpUser.merge_fields[ this.user_field_mappings[ i ].mailshot_field ]};
			arrayIndex++;
		}
		for(var i = 0; i < this.organization_field_mappings.length; i++) 
		{
            this.mailshot_sync_user.extra_merge_fields[ arrayIndex ] = { field_def: this.organization_field_mappings[ i ], value: returnedMailchimpUser.merge_fields[ this.organization_field_mappings[ i ].mailshot_field ] };
            arrayIndex++;
        }
		for (i=0; i < this.mailshot_only_field_mappings.length; i++) 
		{
			this.mailshot_sync_user.extra_merge_fields[ arrayIndex ] = { field_def: this.mailshot_only_field_mappings[ i ], value: returnedMailchimpUser.merge_fields[ this.mailshot_only_field_mappings[ i ].mailshot_field ] };
			arrayIndex++;
		}        

		console.log( "this.mailshot_sync_user has now been set to" );
		console.dir( this.mailshot_sync_user ); console.log( "" );

		this.switchToMainTemplate();
	},    
    
	syncNewUserToMailchimp: function( zendeskUser ) 
	{
		console.log( "syncNewUserToMailchimp called with zendesk user =");
		console.dir( zendeskUser );

		var newMailChimpUserToSave = this.createNewMailchimpSyncUserObject( zendeskUser );

		console.log( "created mailchimp user object to sync new =");
		console.dir( newMailChimpUserToSave );

		this.switchToLoadingScreen( "Adding Mailchimp Member" );
		this.ajax( "createOrUpadateMailChimpListMember", newMailChimpUserToSave, false );
	},
   /* 
	updateUserInMailchimp: function( mailchimpUser ) 
	{
		console.log( "updateUserInMailchimp called with mailchimp =");
		console.dir( zendeskUser );

		var newMailChimpUserToSave = this.createNewMailchimpSyncUserObject( zendeskUser );

		console.log( "created mailchimp user object to save =");
		console.dir( newMailChimpUserToSave );

		this.switchToLoadingScreen( "Adding Mailchimp Member" );
		this.ajax( "createOrUpadateMailChimpListMember", newMailChimpUserToSave, false );
	},
*/
	syncExistingUserToMailchimp: function( zendeskUser ) 
	{
		console.log( "syncExistingUserToMailchimp called with zendesk user =");
		console.dir( zendeskUser );

		var newMailChimpUserToSave = this.createNewMailchimpSyncUserObject( zendeskUser );

		console.log( "created mailchimp user object to sync existing =");
		console.dir( newMailChimpUserToSave );

		this.switchToLoadingScreen( "Updating Mailchimp Member" );
		this.ajax( "createOrUpadateMailChimpListMember", newMailChimpUserToSave, true );
	},

	deleteExistingUserFromMailchimp: function( mailchimpUser ) 
    {
    	console.log( "deleteExistingUserFromMailchimp called with mailchimp user =");
		console.dir( mailchimpUser );

		this.switchToLoadingScreen( "Deleting Mailchimp Member" );
    	this.ajax( "deleteMailChimpListMember", mailchimpUser );
    },

	get_or_createOrUpadateMailChimpListMember_OnFail: function( errorResponse ) 
	{
		console.log( "started createOrUpadateMailChimpListMember_OnFail with the following object:" );
		console.dir( errorResponse ); console.log( "" );

		//check to see if we were in create only mode but the users email address was already found.
	    try
	    {
	        var responseTextJSON = JSON.parse( errorResponse.responseText );

			if( errorResponse.status === 400 && responseTextJSON.title === "Member Exists" )
			{
				return this.switchToErrorMessage( errorResponse, this.zendesk_user.email + " already exists in mailchimp.<br /><br/>Do you want to override his/her details?", "Override", "error_override_mailchimp" );
			}
			if( errorResponse.status === 404 && responseTextJSON.title === "Resource Not Found" )
			{
				return this.switchToErrorMessage( errorResponse, this.zendesk_user.email + " doesn't exist im mailchimp.<br /><br/>Do you want to create a new record for him/her?", "Create New", "error_create_new_mailchimp" );
			}
	    }catch(e)
	    {
	    	
	    }
		this.switchToErrorMessage( errorResponse );
	},

	createOrUpadateMailChimpListMember_Override_OnClick: function() 
	{
		console.log( "started createOrUpadateMailChimpListMember_Override_OnClick" );

		var newMailChimpUserToSave = this.createNewMailchimpSyncUserObject( this.zendesk_user );

    	console.log( "created mailchimp user object to override =");
		console.dir( newMailChimpUserToSave );
//newMailChimpUserToSave.id = 'd6acc35fdec6b59208c6e7e6440aeb84';
		this.syncExistingUserToMailchimp( newMailChimpUserToSave );
	},
    
    createOrUpadateMailChimpListMember_Add_New_OnClick: function() 
	{
		console.log( "started createOrUpadateMailChimpListMember_Add_New_OnClick" );

		//var newMailChimpUserToSave = this.createNewMailchimpSyncUserObject( this.zendesk_user );

    	//console.log( "created mailchimp user object to add new =");
		//console.dir( newMailChimpUserToSave );
//newMailChimpUserToSave.id = 'd6acc35fdec6b59208c6e7e6440aeb84';
		this.syncNewUserToMailchimp( this.zendesk_user );
	},

	createOrUpadateMailChimpListMember_Done: function( returnedMailchimpUser ) 
	{
		console.log( "started createOrUpadateMailChimpListMember_Done with the following object:" );
		console.dir( returnedMailchimpUser ); console.log( "" );
		//if existing user is null or has null id then set id filed on zendesk user object

		this.retrievedMailchimpSubscriber( returnedMailchimpUser );
	},

    createNewMailchimpSyncUserObject: function( zendeskSyncUserObject )
    {
		console.log( "started createNewMailchimpSyncUserObject with the following zendesk user object:" );
		console.dir( zendeskSyncUserObject ); console.log( "" );

    	var useDefaultOrgValues = zendeskSyncUserObject.customer_type === this.resources.USER_FIELD_NAME_CUSTOMER_TYPE_VALUE_USE_DEFAULT;        
 
        //Sanity checks
    	if(zendeskSyncUserObject === null )
    	{
            console.warn("createNewMailchimpSyncUserObject called with null zendeskSyncUserObject");
    		return null;
    	}
        if(!useDefaultOrgValues && zendeskSyncUserObject.orgObject === null )
    	{
            console.warn("createNewMailchimpSyncUserObject called with customer type " + zendeskSyncUserObject.customer_type + " and  null zendeskSyncUserObject.orgObject");
    		return null;
    	}

    	//base object without extra merge fields
		var mailchimpUserToReturn =
		{
			email_address: zendeskSyncUserObject.email,
			status: "subscribed",
			forename: zendeskSyncUserObject.name,
			surname: "SURNAME",
			//organization: this.cloneUserToSyncOrganisationObject( zendeskSyncUserObject.orgObject ),
			customer_type: zendeskSyncUserObject.getMailchimpCustomerType(),
			extra_merge_fields: [],
            clone: function()
            {
                return {    
                    email_address: this.email_address,
                    status: this.status,
                    forename: this.forename,
                    surname: this.surname,
                    customer_type: this.customer_type,
                    extra_merge_fields: this.extra_merge_fields.slice(0)
                };
            }    
		};

		//extra merge fields for organisation fields
		var arrayIndex = 0;
		for (var i=0; i < zendeskSyncUserObject.extra_user_fields.length; i++) 
		{
			mailchimpUserToReturn.extra_merge_fields[ arrayIndex ] = { field_def: zendeskSyncUserObject.extra_user_fields[ i ].field_def, value: ( zendeskSyncUserObject.extra_user_fields[ i ].value === null ) ? "" : zendeskSyncUserObject.extra_user_fields[ i ].value };
			arrayIndex++;
		}
		for (var i=0; i < this.organization_field_mappings.length; i++) 
		{
			mailchimpUserToReturn.extra_merge_fields[ arrayIndex ] = { field_def: this.organization_field_mappings[ i ], value: useDefaultOrgValues ? this.organization_field_mappings[ i ].default_value : zendeskSyncUserObject.orgObject.extra_org_fields[ i ].value };
			arrayIndex++;
		}
		for (i=0; i < this.mailshot_only_field_mappings.length; i++) 
		{
			mailchimpUserToReturn.extra_merge_fields[ arrayIndex ] = { field_def: this.mailshot_only_field_mappings[ i ], value: this.mailshot_only_field_mappings[ i ].default_value };
			arrayIndex++;
		}

		console.log( "mailchimpUserToReturn at end point:" );
		console.dir( mailchimpUserToReturn ); console.log( "" );

		return mailchimpUserToReturn;
    },
    
    //MAIN SCREEN UTILITY FUNCTIONS
    hideFieldsIfInUserLocation: function() 
    {
      /* _.each([this.timeFieldLabel(), this.totalTimeFieldLabel()], function(f) {
        var field = this.ticketFields(f);

        if (field && field.isVisible()) {
          field.hide();
        }
      }, this); */
    },


	//EXCLUDE/ORGANISATION/STANDARD FIELD ONCLICK FUNCTIONS
	excludeButtonOnClick: function()
	{
		console.log( "started excludeButtonOnClick" );
		if( this.currentLocation() === this.resources.APP_LOCATION_USER )
		{
			console.dir(  this.user().customField( this.resources.USER_FIELD_NAME_CUSTOMER_TYPE, this.resources.USER_FIELD_NAME_CUSTOMER_TYPE_VALUE_EXCLUDE ) );
		    //thsi triggers userScreenCustomerTypeFieldChanged to be changed so no need to make any further calls
		}
		else 
		{
			//update via apis
			var updatedUserToSave = this.zendesk_user.clone();
			updatedUserToSave.customer_type = this.resources.USER_FIELD_NAME_CUSTOMER_TYPE_VALUE_EXCLUDE;
			console.log( "About to save user:");
			console.dir( updatedUserToSave );
			this.ajax( 'updateZendeskUser', updatedUserToSave );
		}
		this.switchToLoadingScreen( "Updating Zendesk User" );
	},

	organizationButtonOnClick: function()
	{
		console.log( "started organizationButtonOnClick" );
		if( this.currentLocation() === this.resources.APP_LOCATION_USER )
		{
			console.dir(  this.user().customField( this.resources.USER_FIELD_NAME_CUSTOMER_TYPE, this.resources.USER_FIELD_NAME_CUSTOMER_TYPE_VALUE_USE_ORGANIZATION ) );
		    //this triggers userScreenCustomerTypeFieldChanged to be changed so no need to make any further calls
		}
		else 
		{
			//update via apis
			var updatedUserToSave = this.zendesk_user.clone();
			updatedUserToSave.customer_type = this.resources.USER_FIELD_NAME_CUSTOMER_TYPE_VALUE_USE_ORGANIZATION;
			console.log( "About to save user:");
			console.dir( updatedUserToSave );
			this.ajax( 'updateZendeskUser', updatedUserToSave );
		}
		this.switchToLoadingScreen( "Updating Zendesk User" );
	},

	standardButtonOnClick: function()
	{
		console.log( "started standardButtonOnClick" );
		if( this.currentLocation() === this.resources.APP_LOCATION_USER )
		{
			console.dir( this.user().customField( this.resources.USER_FIELD_NAME_CUSTOMER_TYPE, this.resources.USER_FIELD_NAME_CUSTOMER_TYPE_VALUE_USE_DEFAULT ) );
		    //this triggers userScreenCustomerTypeFieldChanged to be changed so no need to make any further calls
		}
		else 
		{
			//update via apis
			//var updatedUserToSave = this.cloneUserToSyncObject( this.zendesk_user );
            var updatedUserToSave = this.zendesk_user.clone();
			updatedUserToSave.customer_type = this.resources.USER_FIELD_NAME_CUSTOMER_TYPE_VALUE_USE_DEFAULT;
			console.log( "About to save user:");
			console.dir( updatedUserToSave );
			this.ajax( 'updateZendeskUser', updatedUserToSave );
		}
		console.log( "ended standardButtonOnClick" );
		this.switchToLoadingScreen( "Updating Zendesk User" );
	},


	//MAIN SCREEN EVENT FUNCTIONS
    userScreenCustomerTypeFieldChanged: function(evt)
    {
		console.log( "userScreenCustomerTypeFieldChanged called");
		console.log( "event:"); console.dir(evt);

		//fetch new value from field and old value from user
		var oldCustomerType = this.zendesk_user.customer_type;
		var newCustomerTypeSelected = this.user().customField( this.resources.USER_FIELD_NAME_CUSTOMER_TYPE );
		this.changeCustomerType( oldCustomerType, newCustomerTypeSelected );
    },



    //SWITCH TO HTML TEMPLATE FUNCTIONS
    switchToLoadingScreen: function( optionalMessage ) 
    {
        console.log( "started switchToLoadingScreen" );
        this.switchTo( this.resources.TEMPLATE_NAME_LOADING, { optional_message: optionalMessage } );
    },

    switchToMainTemplate: function() 
    {
        console.log( "started switchToMainTemplate with the following object:" );
        console.dir( this.zendesk_user ); console.log( "" );

        var formData = 
        {
            'zendesk_user': this.zendesk_user,
            'mailchimp_user': this.mailshot_sync_user,
            'sync_fields': this.zendesk_user.getFieldSyncInfo( this.mailshot_sync_user ),
            'monkey_URL': this.zendesk_user.isNotset() ? null : ( this.zendesk_user.isExcluded() ? this.assetURL( "exclude_monkey.png" ) : this.assetURL( "outofsync_monkey.png" ) ),
            'buttons': 
            {
                'exclude': { 'show': true, 'classNameInsert': this.zendesk_user.isExcluded() ? " active" : "" },
                'organization': { 'show': ( this.zendesk_user.belongsToOrganization() ), 'classNameInsert': this.zendesk_user.isOrganization() ? " active" : "" },
                'standard': { 'show': true, 'classNameInsert': this.zendesk_user.isDefault() ? " active" : "" }
            },
            'display_params':
            {
                'customer_type_not_set'     : this.zendesk_user.isNotset(),
                'customer_type_exclude'     : this.zendesk_user.isExcluded(),
                'customer_type_included'    : this.zendesk_user.isIncluded(),
                'customer_type_organization': this.zendesk_user.isOrganization(),
                'customer_type_standard'    : this.zendesk_user.isDefault(),
                'user_in_sync'              : false
            }
        };

        console.log( "switching to form with object:" );
        console.dir( formData ); console.log( "" );

        this.switchTo( this.resources.TEMPLATE_NAME_MAIN, formData );
    },

    switchToErrorMessage: function( errorResponse, overrideMessage, additionalButtonText, additionalButtonHandle ) 
    {
        console.log( "started switchToErrorMessage with the folloring object:" );
        console.dir( errorResponse ); console.log( "" );
        console.log( "additionalButtonHandle:" );
        console.dir( additionalButtonHandle ); console.log( "" );
        console.log( "overrideMessage:" );
        console.dir( overrideMessage ); console.log( "" );

        //check for catchall error conditions
	    try
	    {
	        //var responseTextJSON = JSON.parse( errorResponse.responseText );

			if( errorResponse.status === 0 && typeof( overrideMessage ) === "undefined" || overrideMessage === null || overrideMessage === "error" )
			{
				overrideMessage = "Could not connect to API, Please check your internet connection";
			}
	    }catch(e)
	    {
	    	
	    }

        var formData = 
        {
          'errorResponse'			: errorResponse,
          'overrideMessage' 		: ( typeof( overrideMessage ) === "undefined" || overrideMessage === "error") ? null:  overrideMessage, /* sometimes just the string error is passed as the 2nd param!) */
          'additionalButtonText' 	: ( typeof( additionalButtonText ) === "undefined" ) ? null : additionalButtonText,
          'additionalButtonHandle' 	: ( typeof( additionalButtonHandle ) === "undefined" ) ? null : additionalButtonHandle
        };

        this.switchTo( 'show_error', formData );
    },
    
    //OBJECT DEFS
    ZendeskObjects:
    {
        ZendeskOrganization: function( app, id, name, customer_type )
        {
            this.app = app;
            this.id = id;
            this.name = name;
            this.customer_type = customer_type;
            this.extra_org_fields = [];

            for(var i = 0; i < app.organization_field_mappings.length; i++) 
            {
                this.extra_org_fields[ i ] = { field_def: app.organization_field_mappings[ i ], value: null };
            };
            
            this.populateExtraFieldsFromOrganizationAPIData = function( APIOrgData )
            {
                for(var i = 0; i < this.extra_org_fields.length; i++) 
                {
                    this.extra_org_fields[ i ].value = APIOrgData.organization_fields[ this.extra_org_fields[ i ].field_def.zendesk_field ];
                }
            };
            
            this.populateExtraFieldsFromFrameworkOrgObject = function( frameworkOrgObject )
            {
                for(var i = 0; i < this.extra_org_fields.length; i++) 
                {
                    this.extra_org_fields[ i ].value = frameworkOrgObject.customField( this.extra_org_fields[ i ].field_def.zendesk_field );
                }
            };
            this.clone = function()
            {
                var clonedOrganization = new this.app.ZendeskObjects.ZendeskOrganization( this.app, this.id, this.name, this.customer_type );
                console.log( "cloning Org, this.name = '" + this.name + "', new ZendeskOrganization = ");
                console.dir( clonedOrganization );
                for(var i = 0; i < this.extra_org_fields.length; i++) 
                {
                    clonedOrganization.extra_org_fields[ i ] = { field_def: this.extra_org_fields[ i ].field_def, value: this.extra_org_fields[ i ].value };
                }
                console.log( "finished cloning Org, clonedOrganization = ");
                console.dir( clonedOrganization );
                return clonedOrganization;
            };

        },
        
        ZendeskUser: function(app, id, name, email, customer_type, organization_id)
        {
            //console.log( "Started ZendeskUser constructor with id=" + id + ", name = " + name + ", email = " + email +  ", customer_type = " + customer_type + ", app = ...");
            //console.dir( app );
            this.app = app;
            this.id = id;
            this.name = name;
            this.email = email;
            this.customer_type = customer_type;
            this.organization_id = ( typeof( organization_id ) === "undefined" ) ? null : organization_id; //this is underd to store the org id even though this info if available inside the attached org object.
            this.orgObject = null;  //this will only be instantiated when needed, not now, even if there is an organization id
            this.extra_user_fields = [];

            for(var i = 0; i < app.user_field_mappings.length; i++) 
            {
                this.extra_user_fields[ i ] = { field_def: app.user_field_mappings[ i ], value: null };
            }

            this.populateExtraFieldsFromUserAPIData = function( APIUserData )
            {
                for(var i = 0; i < this.extra_user_fields.length; i++) 
                {
                    this.extra_user_fields[ i ].value = APIUserData.user_fields[ this.extra_user_fields[ i ].field_def.zendesk_field ];
                }
            };
            this.populateExtraFieldsFromFrameworkUserObject = function( frameworkUserObject )
            {
                for(var i = 0; i < this.extra_user_fields.length; i++) 
                {
                    this.extra_user_fields[ i ].value = frameworkUserObject.customField( this.extra_user_fields[ i ].field_def.zendesk_field );
                }
            };
            /**
             * inline clone function for user object - deep clones by calling organization.clone too
             * @returns {nm$_ZendeskUser.ZendeskUser.prototype.clone.clonedUser|ZendeskUser.prototype.clone.clonedUser|nm$_ZendeskUser.ZendeskUser}
             */
            this.clone = function()
            {
                console.log( "Started ZendeskUser.prototype.clone with this=");
                console.dir( this );
                console.log( "and this.orgObject = ");
                console.dir( this.orgObject );
                var clonedUser = new this.app.ZendeskObjects.ZendeskUser( this.app, this.id, this.name, this.email, this.customer_type, this.organization_id );
                clonedUser.orgObject = ( this.orgObject === null) ? null : this.orgObject.clone();
                for(var i = 0; i < this.extra_user_fields.length; i++) 
                {
                    clonedUser.extra_user_fields[ i ] = { field_def: this.extra_user_fields[ i ].field_def, value: this.extra_user_fields[ i ].value };
                }
                console.log( "Finished ZendeskUser.prototype.clone, returning:");
                return clonedUser;
            };

            this.isNotset = function() { return this.customer_type === this.app.resources.USER_FIELD_NAME_CUSTOMER_TYPE_VALUE_NOT_SET; };
            this.isExcluded = function() { return this.customer_type === this.app.resources.USER_FIELD_NAME_CUSTOMER_TYPE_VALUE_EXCLUDE; };
            this.isIncluded = function() { return this.customer_type === this.app.resources.USER_FIELD_NAME_CUSTOMER_TYPE_VALUE_USE_ORGANIZATION || this.customer_type === this.app.resources.USER_FIELD_NAME_CUSTOMER_TYPE_VALUE_USE_DEFAULT; };
            this.isOrganization = function() { return this.customer_type === this.app.resources.USER_FIELD_NAME_CUSTOMER_TYPE_VALUE_USE_ORGANIZATION; };
            this.isDefault = function() { return this.customer_type === this.app.resources.USER_FIELD_NAME_CUSTOMER_TYPE_VALUE_USE_DEFAULT; };

            this.belongsToOrganization = function() { return this.organization_id !== null; };
            this.orgObjectIsPopulated = function() { return this.orgObject !== null; };
            this.getMailchimpCustomerType = function() { return this.customer_type === this.app.resources.USER_FIELD_NAME_CUSTOMER_TYPE_VALUE_USE_ORGANIZATION ? this.orgObject.customer_type : this.app.customer_type_field_mapping.default_value; };
            
            this.getFieldSyncInfo = function( mailChimpUser )
            {
                console.log( "starting getFieldSyncInfo with the following 2 user objects" );
                console.dir( this ); console.log( "" );
                console.dir( mailChimpUser ); console.log( "" ); 
                if( mailChimpUser === null )
                {
                    return null;
                }
                
                var sync_fields = [
                    { label: "Email", mc_only: false, zd_value: this.email, mc_value: mailChimpUser.email_address, in_sync: ( this.email === mailChimpUser.email_address ) },
                    { label: "Name", mc_only: false, zd_value: this.name, mc_value: mailChimpUser.forename + " " + mailChimpUser.surname, in_sync:true },
                    { label: "Customer Type", mc_only:false, zd_value: this.getMailchimpCustomerType(), mc_value: mailChimpUser.customer_type, in_sync: ( this.getMailchimpCustomerType() === mailChimpUser.customer_type ) } 
                ];
                
                var tempZdValue = null;
                var tempMcValue = null;
                var arrayIndex = 0;
                for( var i = 0; i < this.extra_user_fields.length; i++ )
                {
                    tempZdValue = this.extra_user_fields[ i ].value;
                    tempMcValue = mailChimpUser.extra_merge_fields[ arrayIndex ].value;
                    tempZdValue = ( tempZdValue === null ) ? "" : tempZdValue; tempMcValue = ( tempMcValue === null ) ? "" : tempMcValue;
                    sync_fields[ arrayIndex+3 ] = 
                    {
                        label: this.extra_user_fields[ i ].field_def.field_label,
                        mc_only: false,
                        zd_value: tempZdValue,
                        mc_value: tempMcValue,
                        in_sync: tempZdValue === tempMcValue
                    };
                    arrayIndex++;
                }
                console.log( "done user fields JSON:" );
                console.dir( sync_fields ); console.log( "" );  
                for( i = 0; i < this.app.organization_field_mappings.length; i++ )
                {
                    tempZdValue = this.isDefault() ? this.app.organization_field_mappings[ i ].default_value : ( this.isOrganization() ? this.orgObject.extra_org_fields[ i ].value : null );
                    tempMcValue = mailChimpUser.extra_merge_fields[ arrayIndex ].value;
                    tempZdValue = ( tempZdValue === null ) ? "" : tempZdValue; tempMcValue = ( tempMcValue === null ) ? "" : tempMcValue;
                    sync_fields[ arrayIndex+3 ] = 
                    {
                        label: this.app.organization_field_mappings[ i ].field_label,
                        mc_only: false,
                        zd_value: tempZdValue,
                        mc_value: tempMcValue,
                        in_sync: tempZdValue === tempMcValue
                    };
                    arrayIndex++;
                }
                console.log( "done org fields JSON:" );
                console.dir( sync_fields ); console.log( "" );  
                for( i = 0; i < this.app.mailshot_only_field_mappings.length; i++ )
                {
                    tempMcValue = mailChimpUser.extra_merge_fields[ arrayIndex ].value;
                    tempMcValue = ( tempMcValue === null ) ? "" : tempMcValue;
                    sync_fields[ arrayIndex+3 ] = 
                    {
                        label: this.app.mailshot_only_field_mappings[ i ].field_label,
                        mc_only: true,
                        zd_value: null,
                        mc_value: tempMcValue,
                        in_sync: true
                    };
                    arrayIndex++;
                }   
                
                return sync_fields;
            };
        }
    }
  };

}());
