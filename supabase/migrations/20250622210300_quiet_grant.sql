/*
  # Grant execute permission for update_dm_read
*/

GRANT EXECUTE ON FUNCTION update_dm_read(uuid, uuid, uuid) TO authenticated;
