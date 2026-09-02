const { sha256Bytes } = require("./artifact_store");
const { sha256Canonical } = require("./contracts");
function createTransform({ transformId, version, apply }){
  if(typeof transformId!=="string"||!transformId.trim())throw new TypeError("transformId must be non-empty");
  if(typeof version!=="string"||!version.trim())throw new TypeError("version must be non-empty");
  if(typeof apply!=="function")throw new TypeError("apply must be a function");
  return Object.freeze({id:transformId,version,apply});
}
function replayTransform(transform,rawBytes){
  if(!transform?.apply)throw new TypeError("transform is required");
  const input=Buffer.isBuffer(rawBytes)?rawBytes:Buffer.from(rawBytes);
  const output=transform.apply(input);
  return {raw_artifact_hash:sha256Bytes(input),data:output,artifact_hash:sha256Canonical(output),transform_id:transform.id,transform_version:transform.version};
}
module.exports={createTransform,replayTransform};