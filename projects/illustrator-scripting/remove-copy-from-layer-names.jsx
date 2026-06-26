var ogDoc = documents[0];

function recurseLayers(ogLyrs, func, param)
{
	var curLy;
	var isInitiallyLocked;

	for( var j = ogLyrs.length - 1; j >= 0; j--)
	{
		// Skip this layer if the layer's name begins with an underscore ("_").
		if( ogLyrs[j].name.substr(0,1) == '_' ) {continue;}

		// Store locked state of the source layer.
		// Note: Copying is allowed from a locked layer, but pasting to a locked layer is not.
		isInitiallyLocked = ogLyrs[j].locked;
		ogLyrs[j].locked = false;

		func(ogLyrs[j], param);

		// RECURSE: Crawl all sub-layers.
		if( ogLyrs[j].layers.length > 0 ) {recurseLayers( ogLyrs[j].layers, func, param );}

		// restore locked state:
		if( isInitiallyLocked ) {ogLyrs.locked = true;}
	}
}

function initUndescoreLayerName(lyr, turnOnUnderscore)
{
	alert(lyr.name + " … " + lyr.name.substr(0,1));

	// Add underscore.
	if( turnOnUnderscore )
	{
		// Skip if there is already an underscore.
		if( lyr.name.substr(0,1) == '_' ) {return;}
		else {lyr.name = "_" + lyr.name;}
	}

	// Remove underscore.
	else
	{
		if( lyr.name.substr(0,1) == '_' ) {lyr.name = lyr.name.substr(1, lyr.name.length);}
		else {return;}
	}
}

function removeCopy(lyr)
{
	var oldName = lyr.name;
	var copyIndex = oldName.lastIndexOf('copy');
	if (copyIndex != -1) {lyr.name = oldName.substring(0, copyIndex);}
}

recurseLayers(ogDoc.layers, removeCopy, null);
