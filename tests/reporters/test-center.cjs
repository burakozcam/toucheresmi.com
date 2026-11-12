// Node's test runner calls this offline reporter; the API never imports it.
module.exports=async function*(source){for await(const event of source){if(['test:pass','test:fail'].includes(event.type)){const d=event.data;yield JSON.stringify({name:d.name,status:d.skip?'skipped':d.todo?'not_run':event.type==='test:pass'?'passed':'failed',durationMs:d.details?.duration_ms??0})+'\n';}}};
